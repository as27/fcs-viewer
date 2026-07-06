
# Features für Version 1.0.11
    
## Modul Trainer

Bei der Konfiguration wurde trainer hinzugefügt. In der Konfiguration zu einem Nutzer sieht das dann z.B. so aus:

```yaml
        modules:
            - members
            - calendar
            - overview
            - finance
            - finance-handkasse
            - inventory
            - tasks
            - protocols
            - trainer
```

Wenn das Modul 

### Individuelle Felder

Damit die Nachweise hinterlegt werden können, wurden individuelle Felder angelegt. Diese lauten:

```yaml
- id: 523235904
  label: Lizenz B gültig bis
  fieldkind: e
  ordersequence: 5
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_LizenzBgueltigbis%'
- id: 523235943
  label: Lizenz C gültig bis
  fieldkind: e
  ordersequence: 3
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_LizenzCgueltigbis%'
- id: 523236060
  label: Sporthelfer-Bescheinigung gültig ab
  fieldkind: e
  ordersequence: 1
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_Sporthelfer-Bescheinigunggueltigab%'
- id: 523236117
  label: Lizenz B Nachweis
  fieldkind: e
  ordersequence: 4
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_LizenzBNachweis%'
- id: 523236273
  label: Lizenz C Nachweis
  fieldkind: e
  ordersequence: 2
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_LizenzCNachweis%'
- id: 523236528
  label: Sporthelfer-Bescheinigung
  fieldkind: e
  ordersequence: 0
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_Sporthelfer-Bescheinigung%'
  - id: 523240143
  label: Übungsleiter Beschreibung
  fieldkind: e
  ordersequence: 1
  showinmemberarea: false
  fieldcollection: 523235832
  description: ""
  placeholder: '%custom_UebungsleiterBeschreibung%'
  ```

Dabei sind folgende Felder für Dateien:
- `523236117 - Lizenz B Nachweis`
- `523236273 - Lizenz C Nachweis`
- `523236528 - Sporthelfer-Bescheinigung`

Foldende Felder sind Datum:
- `523235904 - Lizenz B gültig bis`
- `523235943 - Lizenz C gültig bis`
- `523236060 - Sporthelfer-Bescheinigung gültig ab`

Folgende Felder sind Text(mehrzeilig):
- `523240143 - Übungsleiter Beschreibung`


## Offene Punkte Modul Trainer

Erweitere das Tool um das Modul trainer. Als Überschrift soll das jedoch "Übungsleiter" heissen. Dargestellt, soll dieses nur dann sein, wenn in der Konfiguration auch trainer gesetzt ist.

Als Einstig soll es eine Tabelle geben, welche eine Übersicht über die Übundsleiter gibt. Dabei werden folgende Informationen angezeigt:
- Mitgliedsnummer
- Vorname
- Nachname
- Telefon
- Email
- Lizenz B gültig bis
- Lizenz C gültig bis
- Sporthelfer-Bescheinigung gültig ab
- Übungsleiter Beschreibung

Ganz rechts gibt es dann ein Icon, wo man den Eintrag bearbeiten bzw. Löschen kann.

Als Übungsleiter in der Tabelle sind die Mitglieder die in einem der Felder der obigen Liste einen Wert eingetragen haben.


Ganz oben soll es einen Button gegeben: "Übungsleiter hinzufügen". Dann geht ein Formular auf, welches als erstes eine Suchhilfe für die Mitglieder der Abteilung anbietet. Dann kann ein Mitglieder über die Suchhilfe ausgewählt werden. Danach sind die Fehler für Mitgliedsnr., Vor- und Nachname gefüllt. 

Die weiteren Felder des Formulars sind dann:
- Lizenz B gültig bis: Datum
- Lizenz B gültig bis: Datei
- Lizenz C gültig bis: Datum
- Lizenz C gültig bis: Datei
- Sporthelfer-Bescheinigung gültig ab: Datum
- Sporthelfer-Bescheinigung gültig ab: Datei
- Übungsleiter Beschreibung

Sollte eine Datei vorhanden sein, so soll auch ein Button für den Download der Datei angeboten werden.
