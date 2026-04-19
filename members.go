package main

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/as27/easyvapi"
	"github.com/as27/easyvapi/model"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
)

// MemberRow is a flat representation of a member for the frontend.
type MemberRow struct {
	ID               int    `json:"id"`
	MembershipNumber string `json:"membershipNumber"`
	FirstName        string `json:"firstName"`
	FamilyName       string `json:"familyName"`
	Age              int    `json:"age"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Mobile           string `json:"mobile"`
	DateOfBirth      string `json:"dateOfBirth"`
	Street           string `json:"street"`
	Zip              string `json:"zip"`
	City             string `json:"city"`
	JoinDate         string `json:"joinDate"`
	ResignationDate  string `json:"resignationDate"`
	Groups           string `json:"groups"`
	GroupShorts      string `json:"groupShorts"`
}

// GroupDetail holds resolved details for a single member group.
type GroupDetail struct {
	ID          int    `json:"id"`
	Short       string `json:"short"`
	Name        string `json:"name"`
	Description string `json:"description"`
	NotFound    bool   `json:"notFound"`
}

// DepartmentDetail combines config data with resolved group details.
type DepartmentDetail struct {
	Name   string        `json:"name"`
	Groups []GroupDetail `json:"groups"`
}

// GetDepartmentOverview returns all departments with their resolved group details.
func (a *App) GetDepartmentOverview() ([]DepartmentDetail, error) {
	a.mu.RLock()
	conf := a.extConf
	client := a.apiClient
	a.mu.RUnlock()

	if conf == nil {
		return nil, fmt.Errorf("externe Konfiguration nicht geladen")
	}
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert (kein Token)")
	}

	allGroups, err := client.MemberGroups.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Gruppen konnten nicht geladen werden: %w", err)
	}

	byShort := make(map[string]struct {
		ID          int
		Name        string
		Description string
	}, len(allGroups))
	for _, g := range allGroups {
		byShort[g.Short] = struct {
			ID          int
			Name        string
			Description string
		}{g.ID, g.Name, g.Description}
	}

	result := make([]DepartmentDetail, 0, len(conf.Departments))
	for _, dept := range conf.Departments {
		groups := make([]GroupDetail, 0, len(dept.GroupIDs))
		for _, short := range dept.GroupIDs {
			if g, ok := byShort[short]; ok {
				groups = append(groups, GroupDetail{
					ID:          g.ID,
					Short:       short,
					Name:        g.Name,
					Description: g.Description,
				})
			} else {
				groups = append(groups, GroupDetail{
					Short:    short,
					NotFound: true,
				})
			}
		}
		result = append(result, DepartmentDetail{Name: dept.Name, Groups: groups})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

// GetMembers returns the cached members for the given department.
// If the cache is empty, it fetches from the API.
func (a *App) GetMembers(department string) ([]MemberRow, error) {
	a.mu.RLock()
	cached, ok := a.memberCache[department]
	a.mu.RUnlock()
	if ok {
		return cached, nil
	}
	return a.loadMembers(department)
}

// ReloadMembers clears the cache and fetches fresh data from the API.
func (a *App) ReloadMembers(department string) ([]MemberRow, error) {
	a.mu.Lock()
	delete(a.memberCache, department)
	a.mu.Unlock()
	return a.loadMembers(department)
}

func (a *App) loadMembers(department string) ([]MemberRow, error) {
	a.mu.RLock()
	conf := a.extConf
	client := a.apiClient
	a.mu.RUnlock()

	if conf == nil {
		return nil, fmt.Errorf("externe Konfiguration nicht geladen")
	}
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert (kein Token)")
	}

	var dept *Department
	for i := range conf.Departments {
		if conf.Departments[i].Name == department {
			dept = &conf.Departments[i]
			break
		}
	}
	if dept == nil {
		return nil, fmt.Errorf("Abteilung '%s' nicht gefunden", department)
	}

	groupIDs, err := a.resolveGroupIDs(dept.GroupIDs)
	if err != nil {
		return nil, fmt.Errorf("Gruppen konnten nicht aufgelöst werden: %w", err)
	}

	seen := make(map[int]bool)
	var rows []MemberRow
	for _, gid := range groupIDs {
		opts := &easyvapi.MemberListOptions{
			MemberGroups: []int{gid},
		}
		members, err := client.Members.ListAll(a.ctx, opts)
		if err != nil {
			return nil, fmt.Errorf("Mitglieder für Gruppe %d konnten nicht geladen werden: %w", gid, err)
		}
		today := time.Now().Format("2006-01-02")
		for _, m := range members {
			if !seen[m.ID] {
				if m.ResignationDate != "" && dateOnly(m.ResignationDate) < today {
					continue
				}
				seen[m.ID] = true
				rows = append(rows, memberToRow(m))
			}
		}
	}

	a.mu.Lock()
	a.memberCache[department] = rows
	a.mu.Unlock()

	return rows, nil
}

// resolveGroupIDs maps short names to easyvapi integer group IDs.
func (a *App) resolveGroupIDs(shorts []string) ([]int, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()

	shortSet := make(map[string]bool, len(shorts))
	for _, s := range shorts {
		shortSet[s] = true
	}

	groups, err := client.MemberGroups.ListAll(a.ctx, nil)
	if err != nil {
		return nil, err
	}

	var ids []int
	for _, g := range groups {
		if shortSet[g.Short] {
			ids = append(ids, g.ID)
		}
	}
	return ids, nil
}

// ExportMembersExcel exports all members of the given department as an Excel file.
func (a *App) ExportMembersExcel(department string) (string, error) {
	members, err := a.GetMembers(department)
	if err != nil {
		return "", err
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Mitgliederliste exportieren",
		DefaultFilename: fmt.Sprintf("Mitglieder_%s.xlsx", strings.ReplaceAll(department, " ", "_")),
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel-Tabelle (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil
	}

	f := excelize.NewFile()
	defer f.Close()

	sheet := "Mitglieder"
	f.SetSheetName("Sheet1", sheet)

	headerFill, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"111111"}, Pattern: 1},
		Font:      &excelize.Font{Bold: true, Color: "F5C400", Size: 11, Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: false},
		Border: []excelize.Border{
			{Type: "bottom", Color: "F5C400", Style: 2},
		},
	})
	cellStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	cellStyleAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F5F5F5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	numberStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})
	numberStyleAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Family: "Calibri", Color: "111111"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F5F5F5"}, Pattern: 1},
		Alignment: &excelize.Alignment{Vertical: "center", Horizontal: "center"},
		Border: []excelize.Border{
			{Type: "bottom", Color: "DDDDDD", Style: 1},
		},
	})

	type colDef struct {
		header string
		width  float64
		getter func(MemberRow) interface{}
		center bool
	}
	cols := []colDef{
		{"Nr.", 8, func(m MemberRow) interface{} { return m.MembershipNumber }, true},
		{"Nachname", 18, func(m MemberRow) interface{} { return m.FamilyName }, false},
		{"Vorname", 16, func(m MemberRow) interface{} { return m.FirstName }, false},
		{"Alter", 7, func(m MemberRow) interface{} { return m.Age }, true},
		{"Geburtsdatum", 14, func(m MemberRow) interface{} { return m.DateOfBirth }, true},
		{"E-Mail", 28, func(m MemberRow) interface{} { return m.Email }, false},
		{"Telefon", 16, func(m MemberRow) interface{} { return m.Phone }, false},
		{"Mobil", 16, func(m MemberRow) interface{} { return m.Mobile }, false},
		{"Straße", 22, func(m MemberRow) interface{} { return m.Street }, false},
		{"PLZ", 7, func(m MemberRow) interface{} { return m.Zip }, true},
		{"Stadt", 16, func(m MemberRow) interface{} { return m.City }, false},
		{"Eintritt", 12, func(m MemberRow) interface{} { return m.JoinDate }, true},
		{"Austritt", 12, func(m MemberRow) interface{} { return m.ResignationDate }, true},
		{"Gruppen", 30, func(m MemberRow) interface{} { return m.Groups }, false},
		{"Kürzel", 14, func(m MemberRow) interface{} { return m.GroupShorts }, false},
	}

	f.SetRowHeight(sheet, 1, 22)

	for ci, col := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellValue(sheet, cell, col.header)
		f.SetCellStyle(sheet, cell, cell, headerFill)
		f.SetColWidth(sheet, colLetter(ci+1), colLetter(ci+1), col.width)
	}

	for ri, m := range members {
		row := ri + 2
		f.SetRowHeight(sheet, row, 18)
		isAlt := ri%2 == 1
		for ci, col := range cols {
			cell, _ := excelize.CoordinatesToCellName(ci+1, row)
			f.SetCellValue(sheet, cell, col.getter(m))
			var style int
			if col.center {
				if isAlt {
					style = numberStyleAlt
				} else {
					style = numberStyle
				}
			} else {
				if isAlt {
					style = cellStyleAlt
				} else {
					style = cellStyle
				}
			}
			f.SetCellStyle(sheet, cell, cell, style)
		}
	}

	lastCol, _ := excelize.CoordinatesToCellName(len(cols), len(members)+1)
	disable := false
	_ = f.AddTable(sheet, &excelize.Table{
		Range:          "A1:" + lastCol,
		Name:           "Mitglieder",
		StyleName:      "",
		ShowRowStripes: &disable,
	})
	for ci := range cols {
		cell, _ := excelize.CoordinatesToCellName(ci+1, 1)
		f.SetCellStyle(sheet, cell, cell, headerFill)
	}

	f.SetSheetProps(sheet, &excelize.SheetPropsOptions{
		TabColorRGB: stringPtr("F5C400"),
	})
	f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	if err := f.SaveAs(path); err != nil {
		return "", fmt.Errorf("Excel-Datei konnte nicht gespeichert werden: %w", err)
	}
	return path, nil
}

func colLetter(n int) string {
	result := ""
	for n > 0 {
		n--
		result = string(rune('A'+n%26)) + result
		n /= 26
	}
	return result
}

func stringPtr(s string) *string { return &s }

func calcAge(dob string) int {
	if len(dob) < 10 {
		return 0
	}
	birthYear, err1 := strconv.Atoi(dob[:4])
	birthMonth, err2 := strconv.Atoi(dob[5:7])
	birthDay, err3 := strconv.Atoi(dob[8:10])
	if err1 != nil || err2 != nil || err3 != nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - birthYear
	if now.Month() < time.Month(birthMonth) ||
		(now.Month() == time.Month(birthMonth) && now.Day() < birthDay) {
		age--
	}
	return age
}

func memberToRow(m model.Member) MemberRow {
	var groups, shorts []string
	for _, mg := range m.MemberGroups {
		if mg.MemberGroup.Name != "" {
			groups = append(groups, mg.MemberGroup.Name)
		}
		if mg.MemberGroup.Short != "" {
			shorts = append(shorts, mg.MemberGroup.Short)
		}
	}

	var cd model.ContactDetails
	if m.ContactDetails != nil {
		cd = *m.ContactDetails
	}
	return MemberRow{
		ID:               m.ID,
		MembershipNumber: m.MembershipNumber,
		FirstName:        cd.FirstName,
		FamilyName:       cd.FamilyName,
		Age:              calcAge(cd.DateOfBirth),
		Email:            cd.PrimaryEmail,
		Phone:            cd.PrivatePhone,
		Mobile:           cd.MobilePhone,
		DateOfBirth:      cd.DateOfBirth,
		Street:           cd.Street,
		Zip:              cd.Zip,
		City:             cd.City,
		JoinDate:         dateOnly(m.JoinDate),
		ResignationDate:  dateOnly(m.ResignationDate),
		Groups:           strings.Join(groups, ", "),
		GroupShorts:      strings.Join(shorts, ", "),
	}
}

