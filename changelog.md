# Changelog

Alle wichtigen Änderungen werden hier dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)
und dieses Projekt verwendet [Semantic Versioning 2.0.0](https://semver.org/lang/de/).

## [0.91.0] - 2026-04-17

### Hinzugefügt
- **Finanz-Modul** mit drei Reitern: Übersicht, Bankkonten, Offene Rechnungen
- **Bankkonten-Tab**: Kontoauswahl (aus YAML `bank_account_ids` pro Abteilung), Kontostand, IBAN, Kontobewegungen mit Datumsfilter (Von/Bis) und Suche nach Empfänger/Beschreibung
- **Offene Rechnungen**: Listet alle Rechnungen mit offenem `paymentDifference` für Mitglieder der gewählten Abteilung; Suche nach Name/Nummer/Beschreibung; zeigt offenen Gesamtbetrag
- **Übersicht-Kacheln**: Einnahmen und Ausgaben des laufenden Monats (aus Bankkonten der Abteilung) sowie Summe der offenen Posten mit Anzahl
- **Invoice-Cache** pro Abteilung (in-memory): offene Rechnungen bleiben bei Abteilungswechsel erhalten und stehen sofort zur Verfügung; Cache-Invalidierung über „Neu laden"-Button
- **Datumsformat**: ISO-Datumswerte werden als `TT.MM.JJJJ` angezeigt
- **Suchfeld-Fokus**: Tippen im Buchungs- und Rechnungssuchfeld behält den Cursor ohne Fokusverlust

### Geändert
- `Department`-Struct um `BankAccountIDs []int` (`bank_account_ids` in YAML) erweitert
- `vendor/github.com/as27/easyvapi/model/invoice.go`: Feld `PaymentDifference` ergänzt
- `vendor/github.com/as27/easyvapi/invoice.go`: Defaultquery um `description` und `paymentDifference` erweitert; `InvoiceListOptions` um `PaymentDifferenceNe`/`PaymentDifferenceGte` Filter erweitert
- Neue Go-Methoden: `GetBankAccounts`, `GetBookings`, `GetOpenInvoices`, `ReloadOpenInvoices`, `GetFinanceOverview`

## [0.90.2] - 2026-04-08

### Hinzugefügt
- **Public Key Export**: Public Key kann in den Einstellungen als Textdatei gespeichert und per E-Mail an den Administrator weitergegeben werden
- **Excel-Export**: Mitgliederliste kann als Excel-Datei (`.xlsx`) exportiert werden — alle Spalten enthalten, Design orientiert sich am App-Design (dunkles Farbschema, Vereinsfarben)
- **Alter-Spalte**: In der Mitgliedertabelle und im Excel-Export wird das aktuelle Alter anhand des Geburtsdatums berechnet und angezeigt

### Geändert
- `excelize/v2` als neue Abhängigkeit für Excel-Generierung hinzugefügt
- `build.sh` ergänzt: Ausgabedateinamen enthalten jetzt automatisch die aktuelle Versionsnummer (z. B. `fcs-viewer-0.90.2`, `fcs-viewer-0.90.2.exe`)

### Behoben
- **Gruppen & Kürzel leer**: Spalten „Gruppen" und „Kürzel" in der Mitgliedertabelle und im Excel-Export waren leer, da die easyVerein-API die Gruppendetails als verschachteltes `memberGroup`-Objekt innerhalb der Through-Table-Einträge zurückgibt — `model.MemberGroup` wurde um das Feld `Group *MemberGroupDetail` erweitert, `memberToRow` liest jetzt beide Varianten

## [0.90.1] - 2026-04-06

### Hinzugefügt
- Semantic Versioning eingeführt (Start mit Version 0.90.1)
- Versionsnummer wird in den Einstellungen angezeigt
- `AppVersion`-Konstante in `app.go` als zentrale Versionsverwaltung
- `version`-Feld im `Settings`-Struct und in `GetSettings()` zurückgegeben
