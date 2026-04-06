package ageloader

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"filippo.io/age"
	"filippo.io/age/armor"
)

// cacheKey returns the base filename (without extension) derived from the
// SHA-256 hash of url.
func cacheKey(url string) string {
	sum := sha256.Sum256([]byte(url))
	return hex.EncodeToString(sum[:])
}

// cacheFilePath returns the path to the cached ciphertext file and whether the
// file currently exists on disk.
func (l *Loader) cacheFilePath(url string) (path string, exists bool) {
	p := filepath.Join(l.cacheDir, cacheKey(url)+".age")
	_, err := os.Stat(p)
	return p, err == nil
}

// timestampPath returns the sidecar file path that stores the download time.
func timestampPath(cacheFile string) string {
	return cacheFile + ".ts"
}

// isCacheValid reports whether the cached file for url is within the TTL.
func (l *Loader) isCacheValid(url string) bool {
	cachePath, exists := l.cacheFilePath(url)
	if !exists {
		return false
	}
	raw, err := os.ReadFile(timestampPath(cachePath))
	if err != nil {
		return false
	}
	ts, err := strconv.ParseInt(strings.TrimSpace(string(raw)), 10, 64)
	if err != nil {
		return false
	}
	return time.Since(time.Unix(ts, 0)) < l.cacheTTL
}

// downloadToCache fetches url and writes the response body to cacheFile. It
// also writes the current Unix timestamp to the sidecar file.
func (l *Loader) downloadToCache(ctx context.Context, url, cacheFile string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("ageloader: build request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("ageloader: http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ageloader: http get %s: status %s", url, resp.Status)
	}

	f, err := os.OpenFile(cacheFile, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("ageloader: create cache file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return fmt.Errorf("ageloader: write cache file: %w", err)
	}

	ts := strconv.FormatInt(time.Now().Unix(), 10)
	if err := os.WriteFile(timestampPath(cacheFile), []byte(ts), 0600); err != nil {
		return fmt.Errorf("ageloader: write timestamp: %w", err)
	}
	return nil
}

// decryptFile opens the age-encrypted file at path and returns a ReadCloser
// over the decrypted plaintext using identity. Both binary and ASCII-armored
// age files are supported.
func decryptFile(path string, identity *age.X25519Identity) (io.ReadCloser, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("ageloader: open cache file: %w", err)
	}

	// Peek at the first bytes to detect ASCII armor.
	header := make([]byte, len(armor.Header))
	n, _ := f.Read(header)
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		f.Close()
		return nil, fmt.Errorf("ageloader: seek: %w", err)
	}

	var src io.Reader = f
	if strings.HasPrefix(string(header[:n]), armor.Header) {
		src = armor.NewReader(f)
	}

	r, err := age.Decrypt(src, identity)
	if err != nil {
		f.Close()
		return nil, fmt.Errorf("ageloader: decrypt: %w", err)
	}

	return &readCloser{Reader: r, closer: f}, nil
}

// invalidateCache removes the ciphertext and timestamp sidecar for url.
func (l *Loader) invalidateCache(url string) error {
	cachePath, exists := l.cacheFilePath(url)
	if !exists {
		return nil
	}
	if err := os.Remove(cachePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("ageloader: invalidate cache: %w", err)
	}
	tsPath := timestampPath(cachePath)
	if err := os.Remove(tsPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("ageloader: invalidate timestamp: %w", err)
	}
	return nil
}

// ensureDir creates dir with permissions 0700 if it does not already exist.
func ensureDir(dir string) error {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("ageloader: create cache dir: %w", err)
	}
	return nil
}

// readCloser combines an io.Reader with a separate io.Closer.
type readCloser struct {
	io.Reader
	closer io.Closer
}

func (rc *readCloser) Close() error { return rc.closer.Close() }
