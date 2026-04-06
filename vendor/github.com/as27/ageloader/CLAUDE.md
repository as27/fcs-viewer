# ageloader — Claude Code context

## What this repo is
Go package `ageloader` (module `github.com/youruser/ageloader`).  
Manages an age X25519 key pair and downloads age-encrypted remote files with
local caching and on-demand decryption.

## File map

| File | Purpose |
|---|---|
| `ageloader/ageloader.go` | Public API: `Loader` struct, `New`, `PublicKey`, `Open`, `Invalidate`, options |
| `ageloader/keys.go` | `loadOrCreateKey` / `generateAndSaveKey` — key file I/O |
| `ageloader/cache.go` | Cache path helpers, HTTP download, age decryption, `ensureDir` |
| `test/main.go` | Self-contained integration test (local HTTP server + full workflow) |

## Key design decisions

- **Cache filename**: `hex(sha256(url)) + ".age"` — collision-free, URL-agnostic.
- **Cache validity**: sidecar `*.age.ts` file stores Unix download timestamp; TTL check via `time.Since`.
- **Stale fallback**: `allowStaleOnError=true` by default — returns expired cache when network fails.
- **Private key never exposed**: `identity` field is unexported; only `PublicKey()` is public.
- **File permissions**: key `0600`, cache dir `0700`, cache files `0600`.
- **Error style**: every error wrapped as `fmt.Errorf("ageloader: …: %w", err)`, no panics.

## Public API surface

```go
// Construction
func New(keyPath, cacheDir string, opts ...Option) (*Loader, error)

// Options
func WithCacheTTL(d time.Duration) Option
func WithAllowStaleOnError(allow bool) Option

// Methods
func (l *Loader) PublicKey() string
func (l *Loader) Open(ctx context.Context, url string, force bool) (io.ReadCloser, error)
func (l *Loader) Invalidate(url string) error
```

## Dependency

```
filippo.io/age v1.x   // only external dependency
```

## Run integration test

```sh
go run ./test/
```

## Open design questions (see Konzept/Konzept.md)

1. Password-protected key file (age passphrase) — optional, not yet implemented.
2. Multi-recipient decryption — currently single-recipient only.
3. `AllowStaleOnError` default — currently `true`.
