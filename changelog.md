# Changelog

Alle wichtigen Änderungen werden hier dokumentiert.
Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)
und dieses Projekt verwendet [Semantic Versioning 2.0.0](https://semver.org/lang/de/).

## [1.0.12] - 2026-07-07

### Hinzugefügt
- **macOS Ad-hoc-Signierung**: Im Build-Prozess (`build.sh`) wird die macOS App nun nach dem Kompilieren automatisch ad-hoc signiert (`codesign --force --deep --sign -`), um die Ausführung auf anderen Systemen zu erleichtern und eine grundlegende Anwendungsidentität zu vergeben.

## [1.0.11] - 2026-07-06

### Hinzugefügt
- **Übungsleiter-Modul (Trainer)**: Ein neues Modul zur Erfassung und Pflege von Trainer-Lizenzen, Sporthelfer-Bescheinigungen und deren Gültigkeitsdaten in easyVerein (Custom Fields).
- **Zwei-Schritt Mitglied-Auswahl**: Ein performantes Auswahl-Modal mit Echtzeit-DOM-Filterung auf geladenen Abteilungsmitglieder-Daten (`state.members`) zur Vermeidung von Tastatur-Sperren beim Tippen.
- **Nativer Datei-Upload/Download**: Integration von macOS-Dialogen zur Auswahl lokaler Lizenzen für den Upload und zum Herunterladen/Abspeichern hochgeladener Nachweise.

### Behoben
- **Beziehung-Zuordnungsfehler (Hyperlinked Fields)**: Die API-Felder `customField` und `userObject` bei `POST`/Multipart-Uploads werden nun korrekt als absolute URLs statt Integer-IDs übermittelt, um stillschweigende Validierungsfehler der API zu beheben.
- **Save-Button Lock**: Behebung einer Sperre des Speichern-Buttons im Modal bei wiederholter Interaktion durch Zurücksetzen des Lade-Zustands.
- **Formular-Eingabeverlust**: Behebung eines Datenverlustes, bei dem das Re-Rendering des Modals (beim Klick auf Speichern oder Datei-Auswahl/Löschen) die Eingaben zurückgesetzt hat, durch Zwischenspeichern im UI-State.

## [1.0.10] - 2026-07-04

### Hinzugefügt
- **Mitglieder-Bankverbindungen**: Die Mitgliedertabelle und der Excel-Export wurden um die Bankverbindung-Felder (Kontoinhaber, IBAN, BIC) erweitert. Diese Spalten sind standardmäßig in der Tabelle ausgeblendet und können über das Spalten-Menü eingeblendet werden.
- **Modul-Abhängigkeit**: Sichtbarkeit der Bankverbindung-Spalten in der Mitgliederliste wird nun dynamisch gesteuert (nur sichtbar, wenn das Finanz-Modul aktiv ist).
- **Offene Posten Tabellen-Aufteilung**: Die Spalte "Empfänger" bei offenen Rechnungen wurde in zwei neue Spalten aufgeteilt: "Mitglied" (zeigt den Mitgliedsnamen dynamisch aus den Stammdaten an, inklusive Details-Icon links) und "Zahler" (zeigt den Inhaber der Bankverbindung des Mitglieds).
- **Erweiterte Finanz-Suche**: Die Suche bei offenen Rechnungen filtert nun zusätzlich auch nach Mitgliedsnamen sowie nach dem Namen des Kontoinhabers (Zahler).

### Geändert
- **Abhängigkeits-Update**: `easyvapi` auf Version v1.0.10 aktualisiert, um die integrierten Bankverbindung-Felder des API-Modells zu unterstützen.
- **Robustere Build-Skripte**: `build.sh` bereinigt nun vor dem Verschieben der kompilierten App-Bündel eventuell bereits existierende Ordner, um Fehler beim Überschreiben zu vermeiden.

## [1.0.9] - 2026-06-15

### Behoben
- **Deadlock bei API-Token-Refresh behoben**: Es wurde ein Deadlock-Fehler behoben, der dazu führte, dass das Laden der App unendlich lange blockierte (ohne Timeout). Der Deadlock trat auf, weil beim HTTP 401 Fehler das erneute Laden der Konfiguration fälschlicherweise eine bereits gesperrte Mutex (`configLoadMu`) erneut anforderte. Dies wurde durch Trennung in eine interne, ungesperrte Ladefunktion (`loadExternalConfigLocked`) gelöst.

## [1.0.8] - 2026-06-15

### Behoben
- **Automatischer API-Token-Refresh bei 401**: HTTP 401 (Unauthorized) Fehler, die z. B. nach einem API-Key-Wechsel in der Konfiguration auftreten können, werden nun automatisch abgefangen. Die Anwendung lädt die Konfiguration von `https://as27.github.io/fcspichdata/extern_conf.yaml.age` neu und wiederholt den fehlgeschlagenen Request mit dem neuen Token transparent, bevor ein Fehler an das Frontend gemeldet wird.

## [1.0.7] - 2026-06-10

### Behoben
- **Konfigurations-Laden bei Start**: Ein Race-Condition-Problem beim App-Start behoben, bei dem die Frontend-Anfragen nach Einstellungen und Abteilungen den API-Token und die API-Base-URL als fehlend anzeigten, wenn der ageloader-Cache abgelaufen war.
- **Thread-Sicherheit**: Mutex-Sperren beim Laden der externen Konfiguration implementiert, um parallele Downloads und Cache-Datei-Beschädigungen bei zeitgleichen Frontend-Aufrufen zu verhindern.
- **Lade-Performance**: Die externe Konfiguration wird nun in-memory zwischengespeichert und nur maximal einmal pro Stunde überprüft (statt bei jedem API-Aufruf), was unnötige IO-Zugriffe (Timestamp-Check) verhindert.

## [1.0.6] - 2026-06-08

### Hinzugefügt
- **Aufgaben-Filter**: Option "Erledigt ausblenden" im Aufgaben-Statusfilter hinzugefügt, um alle erledigten Aufgaben auszublenden.
- **Aufgaben löschen**: Rotes Papierkorb-Icon zum Löschen von Aufgaben mit Sicherheitsabfrage integriert.

### Geändert
- **API-Token-Sicherheit**: easyvapi auf v1.0.9 aktualisiert. Automatische Token-Aktualisierungen (Refresh) werden jetzt nur noch ausgeführt, wenn ein Callback registriert ist, um unkontrollierte Token-Änderungen und Ungültigkeiten bei anderen Verwendern zu verhindern.

## [1.0.5] - 2026-05-21

### Hinzugefügt
- **Offene Rechnungen Excel-Export**: Excel-Export für offene Rechnungen analog zum Mitglieder-Export implementiert.
- **Alle auf-/zuklappen**: Button zum gleichzeitigen Auf- und Zuklappen aller offenen Rechnungen hinzugefügt, inklusive parallelem Laden aller Einzelpositionen.

### Geändert
- **Scrollposition stabilisiert**: Scrollposition beim Klick auf offene Rechnungen zur Anzeige von Einzelpositionen bleibt stabil und springt nicht mehr nach oben.
- **Dynamisches Konfigurations-Reloading**: Vor jedem easyVerein API-Abruf wird automatisch die verschlüsselte externe Konfiguration neu geladen. Dies stellt sicher, dass die App bei jedem Aufruf garantiert den aktuellsten API-Key verwendet.

## [1.0.4] - 2026-05-05

### Hinzugefügt
- **Aufgaben-Bearbeitung**: Aufgaben können nun direkt in der App bearbeitet und neu angelegt werden.
- **Aufgaben-Details**: Unterstützung für Aufgabengruppen und verknüpfte Kalender-Termine im Erstellungs- und Bearbeitungsformular.
- **Vorschau-Funktion**: Vor dem endgültigen Speichern einer Aufgabe wird eine Zusammenfassung zur Kontrolle angezeigt.

### Geändert
- **Verbessertes API-Debugging**: Detailliertes Logging für API-Anfragen zur schnelleren Diagnose von Berechtigungs- und Strukturproblemen.
- **Token-Refresh**: Case-insensitive Prüfung des `TokenRefreshNeeded`-Headers in `easyvapi` für zuverlässigere automatische Token-Erneuerung.

### Hinzugefügt
- **Disk-Caching**: Mitglieder-, Finanz- und Inventardaten werden nun für eine Woche unverschlüsselt lokal auf der Festplatte zwischengespeichert, um beim App-Start sofort verfügbar zu sein.
- **Stand der Daten**: Tabellen für Mitglieder, offene Rechnungen und Inventar zeigen nun neben dem "Neu laden"-Button den exakten Zeitstempel der letzten Aktualisierung an (z. B. "Stand: 02.05.2026 08:00 Uhr").

## [1.0.2] - 2026-04-30

### Hinzugefügt
- Neues Modul "Inventar" integriert
- Darstellung von Inventargruppen, Orten und einzelnen Inventar-Items in separaten Reitern
- Caching für das Inventar-Modul hinzugefügt

### Geändert
- UI-Anpassungen im Inventar-Modul für verbesserte Darstellung (Textumbruch bei langen Beschreibungen)

## [1.0.1] - 2026-04-29

### Geändert
- Barzahlung (💵) in offenen Rechnungen nur sichtbar wenn das Modul `finance-handkasse` für den Benutzer aktiv ist

## [1.0.0] - 2026-04-19

### Geändert
- Erste stabile Version: Mitglieder-, Kalender- und Finanz-Modul vollständig implementiert
- Versionssprung auf 1.0.0 (Semantic Versioning)

## [0.91.21] - 2026-04-19

### Geändert
- macOS Traffic Light Buttons werden jetzt korrekt angezeigt (TitleBarDefault)

## [0.91.20] - 2026-04-19

### Geändert
- easyvapi auf v1.0.5 aktualisiert (BillingAccount omitempty in BookingCreate)
- Barzahlung: HTTP 400 "billingAccount: 0" behoben

## [0.91.19] - 2026-04-19

### Geändert
- easyvapi auf v1.0.4 aktualisiert (BankAccount-Feld in BookingCreate)
- Barzahlung: BankAccount-ID wird jetzt korrekt als bankAccount übergeben (statt billingAccount)

## [0.91.18] - 2026-04-19

### Geändert
- easyvapi auf v1.0.3 aktualisiert (RelatedInvoice in BookingCreate wieder verfügbar)
- Barzahlung verknüpft Buchung wieder mit der zugehörigen Rechnung via RelatedInvoice

## [0.91.17] - 2026-04-19

### Geändert
- easyvapi auf v1.0.2 aktualisiert (MemberGroupMembership Through-Model für korrekte Gruppen-Deserialisierung)
- Mitglieder-Modul: Gruppen-Spalte erlaubt jetzt Textumbruch (white-space: normal)
- Barzahlung: `BankAccount` → `BillingAccount` angepasst, `RelatedInvoice` entfernt (nicht mehr in BookingCreate)

## [0.91.16] - 2026-04-18

### Geändert
- Finanz-Modul: CSS-Spezifität für `.col-receiver`/`.col-desc` korrigiert, sodass `white-space: normal` greift und Text in Empfänger-/Beschreibungsspalten umbricht

## [0.91.15] - 2026-04-18

### Geändert
- Finanz-Modul: Spalten „Empfänger" und „Beschreibung" in Bankbuchungen- und Offene-Rechnungen-Tabelle mit `max-width` (18 vw bzw. 22 vw) begrenzt; Text umbricht statt abzuschneiden

## [0.91.14] - 2026-04-18

### Neu
- Einstellungen: Schriftgröße anpassbar (12–22px, Standard 14px) über Schieberegler und A−/A+-Buttons mit Reset; Wert wird in `localStorage` gespeichert
- Alle Schriftgrößen in `app.css` und Inline-Styles auf `rem`-Einheiten umgestellt, damit die Skalierung systemweit greift
- Buchungs- und Rechnungstabellen im Finanz-Modul können horizontal scrollen

## [0.91.13] - 2026-04-18

### Neu
- Einstellungen: Schriftgröße-Einstellung hinzugefügt (unvollständig — Skalierung griff noch nicht)
- Tabellen mit horizontalem Scroll: `.table-scroll` explizit mit `overflow-x: auto`

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
