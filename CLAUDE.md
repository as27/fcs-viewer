# Projekt: fcs-viewer

## Wichtige Abhängigkeiten
Dieses Projekt verwendet `github.com/as27/easyvapi` als primären 
API-Client. **Lies zuerst die Dokumentation unter 
`vendor/github.com/as27/easyvapi/CLAUDE.md`** bevor du Code schreibst.

## Verbotene Patterns
- Keinen eigenen HTTP-Client für die easyVerein API implementieren
- Immer die Typen aus `easyvapi` verwenden, nicht eigene definieren

## Go-Setup
Vendor ist aktiviert. Nach `go get` immer `go mod vendor` ausführen:
```
GONOSUMDB="*" GOPRIVATE="github.com/as27/*" go mod tidy
GONOSUMDB="*" GOPRIVATE="github.com/as27/*" go mod vendor
```
Build: `go build -mod=vendor ./...`

## Projektstruktur
```
fcs-viewer/
├── app.go              # App-Struct: Settings, Departments, Members (Backend)
├── main.go             # Wails-Einstiegspunkt
├── go.mod / go.sum
├── vendor/             # Alle Dependencies (inkl. easyvapi, ageloader)
├── frontend/
│   ├── src/
│   │   ├── main.js     # Vanilla-JS UI: Tabs, Tabelle, Suche, Sortierung
│   │   ├── style.css   # Basis-Styles
│   │   └── app.css     # Komponenten-Styles
│   └── wailsjs/        # Autogenerierte Bindings (wails generate module)
└── build/              # Wails Build-Config
```

## Aktueller Implementierungsstand

### Fertig
- **Wails-Grundgerüst** (v2.12.0, Vanilla+Vite)
- **ageloader-Integration**: Schlüsselpaar beim Start, externe Konfiguration laden
  - Key-Pfad: `~/.config/fcs-viewer/identity.age`
  - Cache: `~/.config/fcs-viewer/cache/`
  - Externe Config URL: `https://as27.github.io/fcspichdata/extern_conf.yaml.age`
- **Externe Konfiguration**: YAML mit Departments → GroupIDs (Short-Kürzel) + API-Vars
- **easyvapi-Integration**: Client wird mit Token+BaseURL aus der externen Config initialisiert
- **Mitglieder-Modul**:
  - Abteilungsauswahl (Dropdown oben)
  - Gruppen-Short-Namen → Integer-IDs auflösen über `MemberGroups.ListAll`
  - Mitglieder laden via `Members.ListAll` mit `MemberGroups`-Filter
  - Cache pro Abteilung (in-memory), Neu-Laden-Button
  - Suche über alle sichtbaren Felder
  - Sortierung nach jeder Spalte (asc/desc)
  - Spalten ein-/ausblendbar
- **Einstellungen-Ansicht**: Public Key (kopierbar), Config-URL, BaseURL, Token (maskiert)
- **Kalender-Modul**:
  - Monatsansicht (7-Spalten-Grid) und Listenansicht (nach Tag gruppiert), umschaltbar per Toggle
  - Events werden pro Kalender via `Events.ListAll` mit `StartGte`/`StartLte` geladen (um Kalender-Zugehörigkeit zu erhalten)
  - Geburtstage der Mitglieder der gewählten Abteilung als Pseudo-Kalender (CalendarID = -1, Farbe Vereinsgelb)
  - Kalender einzeln ein-/ausblendbar (Sidebar-Checkboxen)
  - Monatsnavigation (Vor/Zurück/Heute) + Neu-laden-Button
  - Go-Methoden: `GetCalendars() []CalendarInfo`, `GetCalendarEvents(department, year, month) []CalendarEvent`
- **Finanz-Modul** (ab v0.91.0):
  - Sub-Tabs: Übersicht, Bankkonten, Offene Rechnungen
  - YAML-Feld `bank_account_ids` pro Department → `Department.BankAccountIDs []int`
  - **Bankkonten**: `GetBankAccounts(dept)` filtert API-Konten nach Config-IDs; `GetBookings(id, from, to)` lädt Buchungen mit Datumsfilter
  - **Offene Rechnungen**: `GetOpenInvoices(dept)` / `ReloadOpenInvoices(dept)` — Invoice-Cache pro Abteilung; Namensabgleich Empfänger ↔ Mitglied (Substring, case-insensitive)
  - **Rechnungsdetails**: Klick auf Zeile expandiert Positionen via `GetInvoiceItems(invoiceID)` (lazy load, gecacht); Mahngebühren (`charge`) und Rücklastschriftgebühren (`chargeback`) als eigene Positionen
  - **Barzahlung**: 💵-Icon öffnet Modal; `CreateCashPayment(bankAccountID, amount, date, invNumber, refNumber, receiver)` bucht gegen das gewählte Konto (billingAccount = bankAccountID)
  - **Übersicht**: `GetFinanceOverview(dept)` — Einnahmen/Ausgaben laufender Monat + offene Posten aus Cache
  - `vendor/easyvapi/model/invoice.go` um `PaymentDifference flexFloat64`, `Charges InvoiceCharges`, `RefNumber string` erweitert
  - `vendor/easyvapi/invoice.go`: Defaultquery inkl. `charges{charge,chargeback,total}`; `InvoiceListOptions` um `PaymentDifferenceNe`/`PaymentDifferenceGte` erweitert
  - `InvoiceRow` enthält `Charge` und `Chargeback` für das Frontend

### Wails JS-Bindings regenerieren
Nach Änderungen an den Go-Methoden in `app.go`:
```
wails generate module
```

### Bekannte Einschränkungen
- Gruppen-Auflösung lädt alle MemberGroups per API (kein Cache)
- Rechnungsabgleich per Namens-Substring: funktioniert nur wenn Empfänger-Feld Vor- und Nachname enthält
