# fcs-viewer

Desktop-Anwendung für den FC Spich e.V. zur Verwaltung von Mitgliedern, Kalender und Finanzen über die [easyVerein](https://easyverein.com) API.

## Features

- **Mitglieder**: Abteilungsweise Übersicht, Suche, Sortierung, Spaltenauswahl, Excel-Export
- **Kalender**: Monats- und Listenansicht, Geburtstage, mehrere Kalender ein-/ausblendbar
- **Finanzen**: Bankkonten, Buchungen, offene Rechnungen mit Detailansicht, Barzahlung

## Technologie

- [Wails v2](https://wails.io) (Go + Vanilla JS)
- [easyvapi](https://github.com/as27/easyvapi) — easyVerein API Client
- [ageloader](https://github.com/as27/ageloader) — verschlüsselte Konfiguration via age

## Konfiguration

Die App lädt eine verschlüsselte externe Konfiguration (`extern_conf.yaml.age`) beim Start.  
Der Age-Identity-Key wird unter `~/.config/fcs-viewer/identity.age` erwartet.  
Den zugehörigen Public Key findet man in den Einstellungen der App.

## Build

Voraussetzungen: Go 1.21+, [Wails CLI](https://wails.io/docs/gettingstarted/installation)

```bash
# Entwicklung
wails dev

# Produktion
wails build
```

## Lizenz

MIT — siehe [LICENSE](LICENSE)
