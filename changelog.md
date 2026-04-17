# Changelog

Alle wichtigen Änderungen werden hier dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)
und dieses Projekt verwendet [Semantic Versioning 2.0.0](https://semver.org/lang/de/).

## [0.91.12] - 2026-04-17

### Geändert
- `easyvapi` auf v1.0.0 aktualisiert
- Breaking Changes angepasst:
  - `Invoice.Date/Receiver/Description` sind jetzt `*string` → `derefStr`-Helper hinzugefügt
  - `InvoiceCharges.Chargeback` → `ChargeBack`
  - `Member.ContactDetails` ist jetzt `*ContactDetails` → nil-Check in `memberToRow`
  - `MemberGroup.Group` (through-table) und `BookingCreate.BankAccount` als Vendor-Anpassung zurückgebracht
  - `Invoice.RefNumber` jetzt direkt im Modell vorhanden (kein manuelles Patch mehr nötig)

## [0.91.11] - 2026-04-17

### Geändert
- Barzahlung: `refnumber` der Rechnung wird jetzt im Buchungstext ergänzt (`Barzahlung {Nr.} / Ref: {refnumber}`)
- `CreateCashPayment` ruft intern `Invoices.Get` auf, um `refnumber` zu laden — das Feld ist im Listen-Query der API nicht abfragbar

## [0.91.10] - 2026-04-17

### Geändert
- Buchungskonto-Pflichtfeld (billingAccount) aus der Barzahlung entfernt — die Buchung gegen das Bankkonto (Handkasse) reicht aus
- `CreateCashPayment` nimmt keinen `billingAccountID`-Parameter mehr entgegen
- `GetBillingAccounts`-Methode und zugehöriger State entfernt

## [0.91.9] - 2026-04-17

### Behoben
- Bankkonto und Buchungskonto wurden beide nicht angezeigt: `Promise.all` bricht bei einem Fehler komplett ab. Beide Ladevorgänge laufen jetzt unabhängig voneinander, sodass ein Fehler bei den Buchungskonten die Bankkonten nicht blockiert

## [0.91.8] - 2026-04-17

### Behoben
- Buchungskonten wurden nicht angezeigt: Laden erfolgt jetzt parallel zu den Bankkonten in `loadFinanceAccounts` statt lazy beim Modal-Öffnen — damit sind sie garantiert vorhanden, wenn das Modal geöffnet wird
- `console.log` für geladene Buchungskonten hinzugefügt (temporär für Diagnose)

## [0.91.7] - 2026-04-17

### Behoben
- Buchungskonten-Dropdown zeigte keine Einträge: Fehler beim Laden wird jetzt sichtbar angezeigt (inkl. Fehlermeldung + „Neu laden"-Button); `null`-Rückgabe der API wird abgefangen

## [0.91.6] - 2026-04-17

### Behoben
- Barzahlung: easyVerein erwartet für eine Buchung neben `bankAccount` auch `billingAccount` (Buchungskonto im Kontenrahmen). Beide Felder werden jetzt übergeben.
- `model.BookingCreate` um `BankAccount int` ergänzt (war zuvor nicht vorhanden)

### Geändert
- Barzahlungs-Modal: neues Pflichtfeld „Buchungskonto" (Dropdown, aus API geladen via `GetBillingAccounts`)
- Bestätigungsansicht zeigt jetzt auch das gewählte Buchungskonto
- `CreateCashPayment` nimmt zusätzlich `billingAccountID int` entgegen

## [0.91.5] - 2026-04-17

### Behoben
- Barzahlung: Buchung schlug mit HTTP 400 fehl, da die Bank-Account-ID fälschlicherweise als `billingAccount` übergeben wurde. `BookingCreate` um Feld `BankAccount int` ergänzt; `CreateCashPayment` nutzt jetzt `BankAccount` statt `BillingAccount`

## [0.91.4] - 2026-04-17

### Behoben
- `refnumber` aus dem Invoice-Defaultquery entfernt (API lieferte HTTP 400)

### Geändert
- Barzahlungs-Modal jetzt zweistufig: Eingabe → Bestätigung mit Zusammenfassung aller Buchungsparameter (Konto, Betrag, Datum, Empfänger, Beschreibung) vor dem endgültigen Buchen

## [0.91.3] - 2026-04-17

### Hinzugefügt
- **Barzahlung**: Klick auf 💵-Icon in der Rechnungsliste öffnet ein Modal zur Erfassung einer Barzahlung
  - Kontoauswahl aus den konfigurierten Abteilungskonten (Handkasse)
  - Betrag vorbelegt mit dem offenen Rechnungsbetrag, editierbar
  - Datum vorbelegt mit heute, editierbar
  - Buchung wird mit `Barzahlung <Rechnungsnr.> / Ref: <Referenz>` und Empfängername an die API geschickt
  - Nach erfolgreicher Buchung werden die offenen Rechnungen automatisch neu geladen
- `refnumber`-Feld in `model.Invoice` und im Defaultquery ergänzt; `InvoiceRow` enthält nun `RefNumber`
- Neue Go-Methode: `CreateCashPayment(bankAccountID, amount, date, invNumber, refNumber, receiver)`

## [0.91.2] - 2026-04-17

### Hinzugefügt
- **Rechnungsdetails**: Klick auf eine offene Rechnung klappt die Rechnungspositionen aus (lazy load, in-memory gecacht)
- **Gebühren als eigene Positionen**: Mahngebühren (`charge`) und Bankgebühren wegen Rücklastschrift (`chargeback`) werden — falls > 0 — als eigene Zeilen im Detail-Panel angezeigt (orange hervorgehoben)

### Geändert
- `vendor/easyvapi/model/invoice.go`: neues Struct `InvoiceCharges` + Feld `Charges` in `Invoice`
- `vendor/easyvapi/invoice.go`: `defaultInvoiceQuery` um `charges{charge,chargeback,total}` als Nested-Query erweitert
- `InvoiceRow` in `app.go` um `Charge` und `Chargeback` ergänzt
- Detail-Panel neu gestaltet: weißes Panel mit gelber Akzentlinie, Grid-Layout für Titel / Menge × Preis / Summe, Gebühren in Orange
- Neue Go-Methode: `GetInvoiceItems(invoiceID int) []InvoiceItemRow`

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
