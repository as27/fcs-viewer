package main

// Conf steuert, welche Module und Abteilungen in der App sichtbar sind.
// Diese Datei ist der zentrale Ort für die Anpassung einer Instanz.
var Conf = struct {
	// ActiveModules listet die Module, die in der Sidebar angezeigt werden.
	// Gültige Werte: "overview", "members", "finance", "calendar"
	// Leere Liste = alle Module sichtbar.
	ActiveModules []string

	// ActiveDepartments listet die Abteilungsnamen, die angezeigt werden.
	// Die Namen müssen exakt mit den Namen in der externen Konfiguration übereinstimmen.
	// Leere Liste = alle Abteilungen sichtbar.
	ActiveDepartments []string
}{
	ActiveModules:     []string{"members", "calendar"},
	ActiveDepartments: []string{"Badminton", "Turnen"},
}
