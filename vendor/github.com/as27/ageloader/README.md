# ageloader

Go-Paket zum Verwalten eines age-Schlüsselpaars (X25519) sowie zum Herunterladen, Cachen und Entschlüsseln von age-verschlüsselten Remotedateien.

## Funktionsweise

- Beim ersten Aufruf von `New` wird automatisch ein X25519-Schlüsselpaar erzeugt und in der angegebenen Datei gespeichert (Berechtigungen: `0600`).
- `PublicKey()` gibt den öffentlichen Schlüssel zurück — dieser wird benötigt, um Dateien für diesen Loader zu verschlüsseln.
- `Open` lädt die verschlüsselte Datei per HTTP herunter, speichert den Ciphertext lokal und gibt einen `io.ReadCloser` über den Klartext zurück. Folgeaufrufe liefern den Inhalt aus dem Cache (solange der TTL nicht abgelaufen ist).
- `Invalidate` löscht den Cache-Eintrag für eine URL.

## Schnellstart

```go
l, err := ageloader.New("keys/my.key", "cache/")
if err != nil {
    log.Fatal(err)
}
fmt.Println("Public Key:", l.PublicKey())

r, err := l.Open(ctx, "https://example.com/data.age", false)
if err != nil {
    log.Fatal(err)
}
defer r.Close()
io.Copy(os.Stdout, r)
```

## API

```go
func New(keyPath, cacheDir string, opts ...Option) (*Loader, error)
func WithCacheTTL(d time.Duration) Option       // Standard: 24h
func WithAllowStaleOnError(allow bool) Option   // Standard: true

func (l *Loader) PublicKey() string
func (l *Loader) Open(ctx context.Context, url string, force bool) (io.ReadCloser, error)
func (l *Loader) Invalidate(url string) error
```

## Manueller Test

```sh
go run ./test -key          # Schlüssel erzeugen, Public Key ausgeben
go run ./test -load         # Datei von Remote-URL laden
go run ./test -value        # Entschlüsselten Inhalt ausgeben
```

## Abhängigkeit

```
filippo.io/age v1.x
```
