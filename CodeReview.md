# Code Review: fcs-viewer

**Datum:** 27.05.2026  
**Version:** 1.0.5  
**Reviewer:** Antigravity Code Review

---

## Inhaltsverzeichnis

1. [Zusammenfassung](#zusammenfassung)
2. [Teil 1: Stabilität & Performance](#teil-1-stabilität--performance)
   - [Verhalten nach monatelanger Inaktivität](#verhalten-nach-monatelanger-inaktivität)
   - [Automatisches Nachladen der API-Keys](#automatisches-nachladen-der-api-keys)
   - [Cache-Strategie](#cache-strategie)
   - [Performance-Probleme](#performance-probleme)
   - [Concurrency & Race Conditions](#concurrency--race-conditions)
3. [Teil 2: Sicherheit](#teil-2-sicherheit)
   - [API-Token-Handling](#api-token-handling)
   - [Dateisystem-Sicherheit](#dateisystem-sicherheit)
   - [XSS-Risiken](#xss-risiken)
   - [Eingabevalidierung](#eingabevalidierung)
   - [Kryptografie](#kryptografie)
4. [Teil 3: Lesbarkeit & Organisation](#teil-3-lesbarkeit--organisation)
   - [Code-Duplikation](#code-duplikation)
   - [Dateistruktur](#dateistruktur)
   - [Frontend-Architektur](#frontend-architektur)
   - [Refactoring-Vorschläge](#refactoring-vorschläge)

---

## Zusammenfassung

| Kategorie | Bewertung | Kritische Findings |
|---|---|---|
| Stabilität | ⚠️ Befriedigend | Cache-Expiry nach 7 Tagen, aber ageloader nur 24h |
| Performance | ⚠️ Befriedigend | Redundante API-Aufrufe, kein Gruppen-Cache |
| Sicherheit | ⚠️ Befriedigend | Token im Klartext in der Config, Cache unverschlüsselt |
| Code-Qualität | ⚠️ Befriedigend | Erhebliche Duplikation, monolithische State-Verwaltung |

---

## Teil 1: Stabilität & Performance

### Verhalten nach monatelanger Inaktivität

> **Frage:** Was passiert, wenn das Programm über mehrere Monate nicht gestartet wird?

**Antwort: Die App startet auch nach Monaten problemlos ohne Nutzeraktion.**

Der Ablauf beim Start nach langer Inaktivität:

```
App-Start → ageloader.New() → identity.age lesen → loadExternalConfig()
                                  ↓
                              Schlüsselpaar ist dauerhaft
                              auf Festplatte gespeichert
                              (~/.config/fcs-viewer/identity.age)
```

1. **Schlüsselpaar (`identity.age`):** Wird beim allerersten Start generiert und danach nur noch gelesen. Keine Expiry. ✅
2. **Externe Konfiguration:** Der `ageloader` hat einen Cache-TTL von 24 Stunden (Standard). Nach Monaten ist der Cache abgelaufen → die App lädt die Konfiguration automatisch neu von `https://as27.github.io/fcspichdata/extern_conf.yaml.age`. ✅
3. **Disk-Cache (Mitglieder, Rechnungen etc.):** Hat einen TTL von 7 Tagen (`IsValid()` prüft `time.Since(t) < 7*24*time.Hour`). Nach Monaten ist der Cache abgelaufen → die App lädt automatisch frisch von der API. ✅
4. **In-Memory-Cache:** Ist nach Neustart leer → wird automatisch neu befüllt. ✅

**Mögliche Probleme:**

| Problem | Schwere | Erklärung |
|---|---|---|
| API-Token abgelaufen | 🔴 Hoch | Wenn der easyVerein-Token serverseitig rotiert oder abläuft, muss die externe Konfiguration auf GitHub aktualisiert werden. Die App hat **keinen Mechanismus**, dem Nutzer mitzuteilen, dass ein neuer Token benötigt wird. |
| Externe Config-URL nicht erreichbar | 🟡 Mittel | `ageloader` hat `AllowStaleOnError: true` (Standard) → bei Netzwerkfehler wird die alte gecachte Config verwendet. Wenn der Cache aber leer ist (erster Start auf neuem Rechner ohne Netz), schlägt der Start fehl. |
| GitHub Pages URL geändert | 🔴 Hoch | Die Config-URL ist als Konstante hardcoded. Ändert sich die URL, muss ein neues Binary gebaut werden. |

### Automatisches Nachladen der API-Keys

> **Frage:** Wie werden die API Keys automatisch nachgeladen? Funktioniert das immer ohne Zutun des Anwenders?

**Der Mechanismus im Detail:**

```
                        extern_conf.yaml.age (verschlüsselt, auf GitHub Pages)
                                    │
                                    ▼
                        ageloader.Open(ctx, url, false)
                                    │
                         ┌──────────┴──────────┐
                    Cache gültig?         Cache abgelaufen?
                    (< 24 Stunden)
                         │                      │
                    Cached Datei            HTTP GET → Download
                    entschlüsseln           → Cache schreiben
                         │                  → entschlüsseln
                         ▼                      ▼
                    YAML parsen ──────────── ExternalConfig
                         │
                         ▼
                    Token + BaseURL extrahieren
                         │
                         ▼
                    easyvapi.New(token, WithBaseURL(...))
```

**Wichtig: `getAPIClient()` ruft bei jedem API-Aufruf `loadExternalConfig()` auf:**

```go
// app.go:268-276
func (a *App) getAPIClient() (*easyvapi.Client, error) {
    a.loadExternalConfig()  // ← Jedes Mal!
    a.mu.RLock()
    defer a.mu.RUnlock()
    if a.apiClient == nil {
        return nil, fmt.Errorf("API-Client ist nicht initialisiert")
    }
    return a.apiClient, nil
}
```

Dieses Pattern hat Vor- und Nachteile:

| Aspekt | Bewertung | Detail |
|---|---|---|
| Automatisches Nachladen | ✅ | Der Token wird bei jedem API-Call frisch geprüft, weil `loadExternalConfig()` aufgerufen wird |
| Ohne Nutzeraktion | ✅ | Ja, solange die Config auf GitHub aktuell ist |
| Performance | 🔴 Problem | **Jeder** API-Aufruf triggert `loadExternalConfig()`, was den ageloader Cache-TTL prüft. Das ist 99% der Zeit ein No-Op, aber unnötiger Overhead |
| Token-Refresh durch easyVerein | 🟡 Teilweise | `easyvapi` unterstützt automatischen Token-Refresh (`WithTokenRefreshCallback`), aber **dieser Callback wird nicht genutzt**! Der neue Token wird im Client gesetzt, aber nicht in die externe Config zurückgeschrieben |

**Fazit:** Ja, es funktioniert ohne Nutzeraktion — **solange die externe Konfigurationsdatei auf GitHub Pages aktuell gehalten wird.** Die App selbst hat keine Möglichkeit, einen abgelaufenen Token eigenständig zu erneuern.

### Cache-Strategie

**Aktuelles Caching-Modell (Dreistufig):**

```
Stufe 1: In-Memory-Cache (App.memberCache, App.invoiceCache, ...)
    ↓ Nicht vorhanden oder abgelaufen (> 7 Tage)
Stufe 2: Disk-Cache (~/.config/fcs-viewer/cache/*.json)
    ↓ Nicht vorhanden oder abgelaufen (> 7 Tage)
Stufe 3: API-Aufruf → Ergebnis in Stufe 1 + 2 speichern
```

**Probleme:**

| # | Problem | Datei | Zeilen | Schwere |
|---|---|---|---|---|
| C-1 | **Disk-Cache ist nicht verschlüsselt.** Mitgliederdaten, Rechnungen, IBAN-Nummern liegen im Klartext als JSON in `~/.config/fcs-viewer/cache/` | `app.go` | 128–147 | 🔴 Hoch |
| C-2 | **Cache-Dateien bleiben unbegrenzt auf der Festplatte.** Auch nach 7 Tagen Invalidierung wird die Datei nicht gelöscht, nur nicht mehr verwendet. Alte Daten bleiben lesbar. | `app.go` | 120–126 | 🟡 Mittel |
| C-3 | **Inkonsistente Cache-TTLs:** ageloader nutzt 24h, App-Cache nutzt 7 Tage. Wenn die externe Config sich ändert (z.B. neuer Token), kann es bis zu 24h dauern bis der neue Token aktiv wird. | `ageloader.go` / `app.go` | 89 / 125 | 🟡 Mittel |
| C-4 | **Fehler beim Disk-Cache-Schreiben werden ignoriert** (`_ = saveToDiskCache(...)`) | Diverse | — | 🟡 Mittel |

### Performance-Probleme

| # | Problem | Datei | Zeilen | Schwere |
|---|---|---|---|---|
| P-1 | **`resolveGroupIDs()` lädt ALLE MemberGroups per API** — kein Cache. Bei jeder Mitglieder-Abfrage wird ein zusätzlicher API-Call gemacht. | `members.go` | 205–228 | 🟡 Mittel |
| P-2 | **`getAPIClient()` ruft `loadExternalConfig()` bei jedem einzelnen API-Aufruf auf.** Selbst wenn der ageloader-Cache gültig ist, bedeutet das IO-Operationen (Timestamp-Datei lesen). | `app.go` | 268–276 | 🟡 Mittel |
| P-3 | **`GetCalendarEvents()` macht N+1 API-Aufrufe** — erst alle Kalender laden, dann pro Kalender die Events. Bei 5 Kalendern sind das 6 HTTP-Requests. | `calendar.go` | 54–97 | 🟡 Mittel |
| P-4 | **`loadOpenInvoices()` lädt ALLE Rechnungen** (nicht nur offene) und filtert dann im Client. Bei großen Vereinen kann das sehr viel Daten sein. | `finance.go` | 185–260 | 🟡 Mittel |
| P-5 | **Kein Rate-Limit-Schutz auf App-Ebene.** Der `easyvapi`-Client hat Rate-Limiting (sleep bei < 5 remaining), aber bei schnellem Wechsel zwischen Tabs könnten viele parallele Requests erzeugt werden. | — | — | 🟡 Mittel |
| P-6 | **Kompletter DOM-Neuaufbau bei `render()`**. `document.getElementById('app').innerHTML = ...` zerstört den gesamten DOM und baut ihn neu auf. Keine Virtual-DOM-Bibliothek, kein Diffing. | `main.js` | 20–37 | 🟡 Mittel |
| P-7 | **`loadMembers()` iteriert sequentiell über Gruppen** statt parallel. Bei 5 Gruppen bedeutet das 5 sequentielle API-Aufrufe. | `members.go` | 170–188 | 🟢 Niedrig |

### Concurrency & Race Conditions

| # | Problem | Datei | Schwere |
|---|---|---|---|
| R-1 | **TOCTOU in `getAPIClient()`:** `loadExternalConfig()` setzt `a.apiClient` unter dem Lock. Zwischen dem Unlock in `loadExternalConfig()` und dem `RLock()` in `getAPIClient()` könnte ein anderer Goroutine `apiClient` auf `nil` setzen. | `app.go:268-276` | 🟢 Niedrig (unwahrscheinlich bei Wails) |
| R-2 | **`loadExternalConfig()` ist nicht idempotent geschützt.** Wenn zwei Frontend-Aufrufe gleichzeitig kommen, könnten beide `loadExternalConfig()` parallel ausführen und den HTTP-Download doppelt triggern. | `app.go:219-265` | 🟢 Niedrig |

---

## Teil 2: Sicherheit

### API-Token-Handling

| # | Risiko | Schwere | Beschreibung |
|---|---|---|---|
| S-1 | **Token wird im Klartext aus der verschlüsselten Config extrahiert und im Speicher gehalten** | 🟡 Mittel | Nach der age-Entschlüsselung liegt der Token als `string` in `ExternalConfig.Vars.Token` und im `easyvapi.Client.token` im Prozessspeicher. Das ist bei einer Desktop-App akzeptabel, aber ein Memory-Dump könnte den Token exponieren. |
| S-2 | **Token-Refresh wird nicht persistiert** | 🟡 Mittel | `easyvapi` unterstützt `WithTokenRefreshCallback`, aber die App nutzt es nicht. Wenn die API einen Token-Refresh auslöst, wird der neue Token im Client aktualisiert, aber bei einem Neustart ist der alte Token aus der Config wieder aktiv. |
| S-3 | **`GetSettings()` maskiert den Token, aber unzureichend** | 🟢 Niedrig | Token < 8 Zeichen werden komplett durch `*` ersetzt, was korrekt ist. Token > 8 Zeichen zeigen die ersten 4 und letzten 4 Zeichen. Für einen visuellen Check in den Einstellungen ist das akzeptabel. |
| S-4 | **Debug-Statement in Produktion** | 🟡 Mittel | `tasks.go:181` enthält `fmt.Printf("DEBUG: Saving task ID=%d Name=%s State=%s Due=%v\n", ...)` — das sollte in Produktionscode nicht vorhanden sein und könnte Daten in Logs schreiben. |

### Dateisystem-Sicherheit

| # | Risiko | Schwere | Beschreibung |
|---|---|---|---|
| F-1 | **Disk-Cache enthält sensible Daten im Klartext** | 🔴 Hoch | `~/.config/fcs-viewer/cache/members_*.json` enthält komplette Mitgliederdaten inkl. Namen, Geburtsdaten, Adressen, E-Mails, Telefonnummern. `invoices_*.json` enthält Rechnungsdaten mit IBAN. Diese Dateien sind als JSON mit `0644`-Permissions gespeichert (weltweit lesbar!). |
| F-2 | **Cache-Verzeichnis mit `0755`** | 🟡 Mittel | `app.go:130`: `os.MkdirAll(..., 0755)` — das Cache-Verzeichnis ist für alle Nutzer lesbar. Sollte `0700` sein. |
| F-3 | **Cache-Dateien mit `0644`** | 🔴 Hoch | `app.go:137`: `os.WriteFile(path, b, 0644)` — jeder Nutzer auf dem System kann die Mitgliederdaten lesen. Muss `0600` sein. |
| F-4 | **ExportPublicKey schreibt an beliebigen Pfad** | 🟢 Niedrig | Nutzer wählt den Pfad über den nativen Datei-Dialog, keine serverseitige Path-Traversal-Gefahr. Aber es gibt keine Validierung, ob die Datei eine `.txt`-Endung hat. |
| F-5 | **ageloader speichert korrekt mit `0600`** | ✅ | Die `identity.age`-Datei und ageloader-Cache-Dateien werden korrekt mit `0600` geschrieben. |

### XSS-Risiken

Die App nutzt Wails (WebView) und rendert HTML mit `innerHTML`. XSS ist hier weniger kritisch als bei einer Web-App, da kein externer Angreifer URLs injizieren kann. Trotzdem:

| # | Risiko | Datei | Beschreibung |
|---|---|---|---|
| X-1 | **`esc()` und `escHtml()` sind identisch** | `utils.js:15-21` | Beide Funktionen machen exakt das Gleiche. Keine unterscheidet zwischen Attribut- und Content-Kontext. |
| X-2 | **Konsequente Nutzung von `esc()`** | Diverse | Die meisten User-sichtbaren Daten werden durch `esc()` gefiltert. ✅ |
| X-3 | **`innerHTML` ohne Framework** | `main.js` | Da es sich um eine Desktop-App handelt und die Daten aus einer kontrollierten API kommen, ist das Risiko gering. Bei einer Web-App wäre das ein Problem. |

### Eingabevalidierung

| # | Risiko | Datei | Schwere | Beschreibung |
|---|---|---|---|---|
| V-1 | **`CreateCashPayment()` validiert keine Eingaben** | `finance.go:293` | 🟡 Mittel | `amount`, `date`, `invNumber`, `receiver` werden ohne Validierung an die API weitergereicht. Negative Beträge oder ungültige Datumsformate könnten zu falschen Buchungen führen. |
| V-2 | **`SaveTask()` validiert keine Eingaben** | `tasks.go:163` | 🟡 Mittel | `row.Name` könnte leer sein, `row.State` könnte ungültig sein. Die API-Ebene fängt das möglicherweise ab, aber eine clientseitige Validierung fehlt. |
| V-3 | **`department`-Parameter wird nicht gegen die Config validiert** | Diverse | 🟢 Niedrig | Ein ungültiger Department-Name führt zu einer Fehlermeldung, aber keine sanitization. |

### Kryptografie

| # | Aspekt | Bewertung | Beschreibung |
|---|---|---|---|
| K-1 | **age X25519 Verschlüsselung** | ✅ | State-of-the-art asymmetrische Verschlüsselung für die externe Config. |
| K-2 | **Schlüsselerzeugung** | ✅ | `age.GenerateX25519Identity()` nutzt kryptografisch sichere Zufallszahlen. |
| K-3 | **Schlüsselspeicherung** | ✅ | `identity.age` wird mit `0600` geschrieben. |
| K-4 | **HTTPS für API** | ✅ | `defaultBaseURL` ist `https://easyverein.com/api/v2.0`. |
| K-5 | **HTTPS für Config** | ✅ | Config-URL ist `https://as27.github.io/...`. |

---

## Teil 3: Lesbarkeit & Organisation

### Code-Duplikation

#### 🔴 Kritisch: Excel-Export-Code

Die Dateien `members.go` (ExportMembersExcel) und `finance.go` (ExportInvoicesExcel) enthalten **nahezu identischen Code** für die Excel-Erstellung:

```
members.go:230-384  (155 Zeilen)  ←  ~80% identisch  →  finance.go:393-567 (175 Zeilen)
```

Duplikate:
- Style-Definitionen (headerFill, cellStyle, cellStyleAlt, numberStyle, numberStyleAlt, amountStyle, amountStyleAlt) — **~100 Zeilen identisch**
- Sheet-Setup (SetRowHeight, SetColWidth, AddTable, SetSheetProps, SetPanes) — **~30 Zeilen identisch**
- Row-Iteration mit alternierenden Styles — **~20 Zeilen identisch**

#### 🟡 Mittel: Caching-Pattern

Jede `Get*()` und `load*()` Methode folgt exakt demselben Pattern:

```go
func (a *App) GetXxx() (CachedData[T], error) {
    a.mu.RLock()
    cached := a.xxxCache       // 1. In-Memory prüfen
    a.mu.RUnlock()
    if cached valid → return

    loadFromDiskCache(...)     // 2. Disk-Cache prüfen
    if valid → store in memory → return

    return a.loadXxxData()     // 3. API laden
}
```

Dieses Pattern ist in **5 Dateien** dupliziert:
- `members.go:112-130` 
- `finance.go:157-175`
- `tasks.go:14-33`
- `protocols.go:10-29`
- `inventory.go:49-67`

#### 🟡 Mittel: Department-Lookup

Der Code zum Finden einer Abteilung in der Config ist 4× dupliziert:

```go
var dept *Department
for i := range conf.Departments {
    if conf.Departments[i].Name == department {
        dept = &conf.Departments[i]
        break
    }
}
```

Vorkommnisse:
- `finance.go:79-85`
- `finance.go:353-358`
- `members.go:152-158`
- (indirekt auch in `GetDepartments()`)

### Dateistruktur

**Backend (Go):**

| Datei | Zeilen | Verantwortlichkeit | Bewertung |
|---|---|---|---|
| `app.go` | 357 | App-Struct, Config, Settings, Types | ⚠️ Zu viel Verantwortung |
| `finance.go` | 568 | Finanzen + Excel-Export | ⚠️ Zu lang |
| `members.go` | 452 | Mitglieder + Excel-Export | ⚠️ Zu lang |
| `calendar.go` | 133 | Kalender | ✅ |
| `tasks.go` | 202 | Aufgaben | ✅ |
| `protocols.go` | 83 | Protokolle | ✅ |
| `inventory.go` | 157 | Inventar | ✅ |
| `utils.go` | 17 | 2 Hilfsfunktionen | ✅ |
| `conf.go` | 6 | Kommentar, kein Code | ⚠️ Löschen |

**Problem in `app.go`:** Diese Datei enthält zu viele verschiedene Aspekte:
- Alle Daten-Typen (Row-Structs, Cache, Settings)
- App-Struct mit allen Feldern
- Konfigurationslogik
- Cache-Hilfsfunktionen
- API-Client-Verwaltung
- Settings-Endpunkt
- Department-Endpunkt
- Public-Key-Export

**Frontend (JS):**

| Datei | Zeilen | Verantwortlichkeit | Bewertung |
|---|---|---|---|
| `main.js` | 357 | Bootstrap, Render, Events | ⚠️ Zu viele Event-Listener in einer Datei |
| `finance.js` | ~900 | Finanzen + Cash-Payment | ⚠️ Zu lang |
| `state.js` | 106 | Globaler State | ⚠️ Monolithisch |
| `tasks.js` | ~450 | Aufgaben + Modal | 🟡 |
| Andere | <150 | Einzelne Module | ✅ |

### Frontend-Architektur

**Stärken:**
- Module sind in separate Dateien aufgeteilt ✅
- `init(render, refreshContent)` Pattern ist konsistent ✅  
- `esc()` wird konsequent genutzt ✅
- SVG-Icons sind inline — keine externe Abhängigkeit ✅

**Schwächen:**

| # | Problem | Beschreibung |
|---|---|---|
| FE-1 | **Kein Routing / Deep-Linking** | Tab-State geht bei App-Neustart verloren. |
| FE-2 | **Monolithischer State** | `state.js` ist ein einzelnes Objekt mit ~60 Properties. Keine Trennung nach Modul. |
| FE-3 | **Render-Kaskade** | `render()` baut den gesamten DOM neu auf. `refreshContent()` baut den Content-Bereich neu auf. Bei jedem Tastendruck im Suchfeld wird der komplette Content neu gerendert. |
| FE-4 | **Event-Listener werden bei jedem Render neu registriert** | `attachListeners()` wird bei jedem `render()` und `refreshContent()` aufgerufen und registriert alle Event-Listener neu via `addEventListener`. Keine Delegation. |
| FE-5 | **Callback-Passing statt Event-System** | Jedes Modul bekommt `render` und `refreshContent` über `init()`. Ein einfaches Event-System wäre sauberer. |

---

## Refactoring-Vorschläge

### Priorität 1 — Sicherheit (sofort umsetzen)

#### R-1: Dateiberechtigungen korrigieren

```diff
// app.go – saveToDiskCache
- if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
+ if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
      return err
  }
  ...
- return os.WriteFile(path, b, 0644)
+ return os.WriteFile(path, b, 0600)
```

#### R-2: Debug-Statement entfernen

```diff
// tasks.go:181
- fmt.Printf("DEBUG: Saving task ID=%d Name=%s State=%s Due=%v\n", row.ID, row.Name, row.State, tc.Due)
```

### Priorität 2 — Stabilität (kurzfristig umsetzen)

#### R-3: `getAPIClient()` nicht bei jedem Aufruf Config neu laden

```go
// Statt bei jedem API-Aufruf loadExternalConfig() aufzurufen,
// einen TTL-Check einbauen:
func (a *App) getAPIClient() (*easyvapi.Client, error) {
    a.mu.RLock()
    client := a.apiClient
    a.mu.RUnlock()
    if client != nil {
        return client, nil
    }
    // Nur laden, wenn noch kein Client existiert
    a.loadExternalConfig()
    a.mu.RLock()
    defer a.mu.RUnlock()
    if a.apiClient == nil {
        return nil, fmt.Errorf("API-Client ist nicht initialisiert")
    }
    return a.apiClient, nil
}
```

#### R-4: Eingabevalidierung für `CreateCashPayment`

```go
func (a *App) CreateCashPayment(...) error {
    if amount <= 0 {
        return fmt.Errorf("Betrag muss positiv sein")
    }
    if _, err := time.Parse("2006-01-02", date); err != nil {
        return fmt.Errorf("Ungültiges Datum: %w", err)
    }
    if receiver == "" {
        return fmt.Errorf("Empfänger darf nicht leer sein")
    }
    // ... Rest
}
```

### Priorität 3 — Code-Qualität (mittelfristig umsetzen)

#### R-5: Excel-Export generisch machen

Eine neue Datei `export.go` mit einer generischen Export-Funktion:

```go
// export.go
type ExcelColumn[T any] struct {
    Header  string
    Width   float64
    Getter  func(T) interface{}
    Center  bool
    IsAmount bool
}

func ExportToExcel[T any](ctx context.Context, 
    title string, 
    defaultFilename string, 
    data []T, 
    columns []ExcelColumn[T],
) (string, error) {
    // Gemeinsamer Code für Style-Definitionen, Sheet-Setup,
    // Row-Iteration, Table-Erstellung, Panes, etc.
}
```

Dann reduzieren sich `ExportMembersExcel` und `ExportInvoicesExcel` auf ~20 Zeilen.

#### R-6: Cache-Pattern generisch machen

```go
// cache.go
type CacheLoader[T any] struct {
    mu       sync.RWMutex
    memory   *CachedData[T]
    diskFile string
}

func (c *CacheLoader[T]) Get(loadFn func() (T, error)) (CachedData[T], error) {
    // 1. Memory-Check
    // 2. Disk-Check
    // 3. loadFn aufrufen und cachen
}
```

#### R-7: Department-Lookup extrahieren

```go
// app.go
func (a *App) findDepartment(name string) (*Department, error) {
    a.mu.RLock()
    defer a.mu.RUnlock()
    if a.extConf == nil {
        return nil, fmt.Errorf("externe Konfiguration nicht geladen")
    }
    for i := range a.extConf.Departments {
        if a.extConf.Departments[i].Name == name {
            return &a.extConf.Departments[i], nil
        }
    }
    return nil, fmt.Errorf("Abteilung '%s' nicht gefunden", name)
}
```

#### R-8: `app.go` aufteilen

Vorgeschlagene Struktur:

```
app.go       → App-Struct, startup, getAPIClient (< 100 Zeilen)
config.go    → ExternalConfig, loadExternalConfig, findDepartment
settings.go  → GetSettings, GetDepartments, ExportPublicKey
cache.go     → CachedData, saveToDiskCache, loadFromDiskCache
types.go     → Alle Row/Overview-Typen
export.go    → Generischer Excel-Export
```

#### R-9: `conf.go` löschen

Die Datei enthält nur einen Kommentar und keinen Code.

#### R-10: Frontend-State nach Modul aufteilen

```js
// Statt einem monolithischen state-Objekt:
export const memberState = { members: [], loading: false, ... };
export const financeState = { accounts: [], invoices: [], ... };
export const calendarState = { events: [], calendars: [], ... };
// etc.
```

#### R-11: Event-Delegation im Frontend nutzen

Statt bei jedem Render alle Event-Listener neu zu registrieren:

```js
// Ein einmaliger Listener auf dem App-Container:
document.getElementById('app').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { switchTab(tab.dataset.tab); return; }
    
    const copy = e.target.closest('[data-copy]');
    if (copy) { copyToClipboard(copy.dataset.copy); return; }
    // etc.
});
```

### Priorität 4 — Nice-to-Have

| # | Vorschlag | Beschreibung |
|---|---|---|
| R-12 | **Logging-Framework** | Statt `fmt.Printf("DEBUG: ...")` ein strukturiertes Logging nutzen (`log/slog`). |
| R-13 | **MemberGroups cachen** | `resolveGroupIDs()` sollte das Ergebnis cachen, da sich Gruppen selten ändern. |
| R-14 | **Paralleles Laden** | `loadMembers()` könnte die Gruppen-API-Aufrufe parallel machen (`errgroup`). |
| R-15 | **Graceful Error UI** | Netzwerkfehler werden im Frontend als generischer Error-String angezeigt. Eine spezifischere Fehlerbehandlung (Retry-Button, Offline-Hinweis) wäre benutzerfreundlicher. |
| R-16 | **`esc()` und `escHtml()` zusammenführen** | Beide Funktionen sind identisch. Eine entfernen. |

---

## Gesamtbewertung

Die Applikation ist **funktional stabil** und erfüllt ihren Zweck als Vereinsverwaltungs-Tool. Die age-Verschlüsselung für die externe Konfiguration ist ein gutes Sicherheitskonzept. Die automatische Konfigurationserneuerung funktioniert transparent.

Die **kritischsten Punkte** sind:
1. **Dateiberechtigungen `0644` für sensible Cache-Dateien** (Mitgliederdaten, Finanzdaten) — sollte sofort auf `0600` geändert werden
2. **Debug-Statement in Produktion** — sollte sofort entfernt werden
3. **Erhebliche Code-Duplikation** bei Excel-Export und Cache-Pattern — sollte mittelfristig refactored werden

Die Architektur ist für die aktuelle Größe des Projekts angemessen, wird aber mit weiteren Modulen zunehmend schwerer wartbar. Die vorgeschlagenen Refactoring-Maßnahmen (generischer Cache, generischer Excel-Export, Aufteilung von `app.go`) würden die Wartbarkeit deutlich verbessern.
