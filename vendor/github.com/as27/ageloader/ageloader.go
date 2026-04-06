// Package ageloader manages an age X25519 key pair and downloads encrypted
// remote files that are cached locally and decrypted on demand.
//
// # Overview
//
// A [Loader] holds a private X25519 identity whose corresponding public key
// can be used to encrypt files with the age tool or any compatible library.
// [Loader.Open] downloads such an encrypted file, stores the raw ciphertext in
// a local cache directory, and returns an [io.ReadCloser] over the plaintext.
// Subsequent calls reuse the cached ciphertext until the TTL expires.
//
// # Quick start
//
//	l, err := ageloader.New("keys/my.key", "cache/")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Println("Public Key:", l.PublicKey())
//
//	r, err := l.Open(ctx, "https://example.com/data.age", false)
//	if err != nil {
//	    log.Fatal(err)
//	}
//	defer r.Close()
//
//	var result MyStruct
//	json.NewDecoder(r).Decode(&result)
//
// # Cache
//
// Cached files are stored as `hex(sha256(url)).age` inside cacheDir.
// A sidecar file `*.age.ts` holds the Unix download timestamp used for TTL
// checks. The default TTL is 24 hours and can be changed via [WithCacheTTL].
//
// # Error handling
//
// All errors are wrapped with the prefix "ageloader: …". No panics are
// triggered. When a network error occurs and a (possibly stale) cached file
// exists, the behaviour depends on [AllowStaleOnError]: when true the stale
// cache is returned instead of the network error.
package ageloader

import (
	"context"
	"io"
	"path/filepath"
	"time"

	"filippo.io/age"
)

// Loader manages an age X25519 key pair and a local cache of encrypted files.
// Create one with [New].
type Loader struct {
	identity          *age.X25519Identity
	keyPath           string
	cacheDir          string
	cacheTTL          time.Duration
	allowStaleOnError bool
}

// Option is a functional option for [New].
type Option func(*Loader)

// WithCacheTTL sets the cache time-to-live. The default is 24 hours.
func WithCacheTTL(d time.Duration) Option {
	return func(l *Loader) { l.cacheTTL = d }
}

// WithAllowStaleOnError controls whether a stale (expired) cache entry is
// returned when a network error occurs instead of propagating the error.
// Default: true.
func WithAllowStaleOnError(allow bool) Option {
	return func(l *Loader) { l.allowStaleOnError = allow }
}

// New creates a [Loader] using the key file at keyPath and the cache directory
// at cacheDir.
//
//   - If keyPath exists the X25519 identity is read from it.
//   - If keyPath does not exist a new identity is generated and written to
//     keyPath with file permissions 0600.
//
// cacheDir is created with permissions 0700 if it does not exist yet.
func New(keyPath, cacheDir string, opts ...Option) (*Loader, error) {
	l := &Loader{
		keyPath:           keyPath,
		cacheDir:          cacheDir,
		cacheTTL:          24 * time.Hour,
		allowStaleOnError: true,
	}
	for _, o := range opts {
		o(l)
	}

	if err := ensureDir(filepath.Dir(keyPath)); err != nil {
		return nil, err
	}
	identity, err := loadOrCreateKey(keyPath)
	if err != nil {
		return nil, err
	}
	l.identity = identity

	if err := ensureDir(cacheDir); err != nil {
		return nil, err
	}
	return l, nil
}

// PublicKey returns the age recipient string for the public half of the managed
// key pair (e.g. "age1…"). Use this value to encrypt files intended for this
// Loader.
//
// The private key is never exposed through the API.
func (l *Loader) PublicKey() string {
	return l.identity.Recipient().String()
}

// Open returns an [io.ReadCloser] that streams the decrypted contents of the
// file at url.
//
// Cache behaviour:
//
//   - force=false: if a valid cached ciphertext exists (within TTL) it is
//     decrypted and returned without a network request.
//   - force=true or cache miss/expired: the file is downloaded via HTTP GET,
//     stored in the cache, then decrypted.
//
// When a network error occurs and [WithAllowStaleOnError] is true (the
// default), the stale cached file is used as a fallback.
//
// The caller must close the returned [io.ReadCloser].
func (l *Loader) Open(ctx context.Context, url string, force bool) (io.ReadCloser, error) {
	cached, hasCache := l.cacheFilePath(url)

	if !force && hasCache && l.isCacheValid(url) {
		return decryptFile(cached, l.identity)
	}

	err := l.downloadToCache(ctx, url, cached)
	if err != nil {
		if l.allowStaleOnError && hasCache {
			return decryptFile(cached, l.identity)
		}
		return nil, err
	}

	return decryptFile(cached, l.identity)
}

// Invalidate removes the cached ciphertext and its timestamp sidecar for url.
// It is a no-op when no cache entry exists.
func (l *Loader) Invalidate(url string) error {
	return l.invalidateCache(url)
}
