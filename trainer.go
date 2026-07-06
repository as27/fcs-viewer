package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Custom field definitions for Trainer module
const (
	FieldIDLizenzBGueltigBis    = 523235904
	FieldIDLizenzCGueltigBis    = 523235943
	FieldIDSporthelferGueltigAb = 523236060
	FieldIDLizenzBNachweis      = 523236117
	FieldIDLizenzCNachweis      = 523236273
	FieldIDSporthelfer          = 523236528
	FieldIDUebungsleiterDesc    = 523240143
)

// TrainerRow is a flat representation of a trainer for the frontend.
type TrainerRow struct {
	MemberID               int    `json:"memberId"`
	MembershipNumber       string `json:"membershipNumber"`
	FirstName              string `json:"firstName"`
	FamilyName             string `json:"familyName"`
	Phone                  string `json:"phone"`
	Email                  string `json:"email"`
	LizenzBGueltigBis      string `json:"lizenzBGueltigBis"`
	LizenzBGueltigBisValID int    `json:"lizenzBGueltigBisValId"`
	LizenzBNachweis        string `json:"lizenzBNachweis"` // URL or filename
	LizenzBNachweisValID   int    `json:"lizenzBNachweisValId"`
	LizenzCGueltigBis      string `json:"lizenzCGueltigBis"`
	LizenzCGueltigBisValID int    `json:"lizenzCGueltigBisValId"`
	LizenzCNachweis        string `json:"lizenzCNachweis"`
	LizenzCNachweisValID   int    `json:"lizenzCNachweisValId"`
	SporthelferGueltigAb   string `json:"sporthelferGueltigAb"`
	SporthelferGueltigAbValID int `json:"sporthelferGueltigAbValId"`
	Sporthelfer            string `json:"sporthelfer"`
	SporthelferValID       int    `json:"sporthelferValId"`
	UebungsleiterDesc      string `json:"uebungsleiterDesc"`
	UebungsleiterDescValID int    `json:"uebungsleiterDescValId"`
}

type trainerCustomFieldVal struct {
	ID          int    `json:"id"`
	Value       string `json:"value"`
	CustomField struct {
		ID int `json:"id"`
	} `json:"customField"`
}

type trainerMemberWithCF struct {
	ID               int    `json:"id"`
	MembershipNumber string `json:"membershipNumber"`
	ContactDetails   *struct {
		FirstName    string `json:"firstName"`
		FamilyName   string `json:"familyName"`
		PrivatePhone string `json:"privatePhone"`
		PrimaryEmail string `json:"primaryEmail"`
	} `json:"contactDetails"`
	CustomFields []trainerCustomFieldVal `json:"customFields"`
}

type trainerListResponse struct {
	Results []trainerMemberWithCF `json:"results"`
	Next    *string               `json:"next"`
}

// GetTrainers returns the cached trainers data or fetches it if empty.
func (a *App) GetTrainers(department string) (CachedData[[]TrainerRow], error) {
	a.mu.RLock()
	cached, ok := a.trainerCache["trainers_"+department] // Use trainerCache
	a.mu.RUnlock()

	if ok && cached.IsValid() {
		return cached, nil
	}

	var diskCache CachedData[[]TrainerRow]
	err := loadFromDiskCache(fmt.Sprintf("trainers_%s.json", department), &diskCache)
	if err == nil && diskCache.IsValid() {
		a.mu.Lock()
		a.trainerCache["trainers_"+department] = diskCache
		a.mu.Unlock()
		return diskCache, nil
	}

	return a.loadTrainersData(department)
}

// ReloadTrainers clears the cache and fetches fresh trainers data.
func (a *App) ReloadTrainers(department string) (CachedData[[]TrainerRow], error) {
	a.mu.Lock()
	delete(a.trainerCache, "trainers_"+department)
	a.mu.Unlock()
	return a.loadTrainersData(department)
}

func (a *App) loadTrainersData(department string) (CachedData[[]TrainerRow], error) {
	a.mu.RLock()
	conf := a.extConf
	token := ""
	baseURL := ""
	if conf != nil {
		token = conf.Vars.Token
		baseURL = conf.Vars.BaseURL
	}
	a.mu.RUnlock()

	if conf == nil || token == "" || baseURL == "" {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Konfiguration oder API-Verbindung nicht bereit")
	}

	var dept *Department
	for i := range conf.Departments {
		if conf.Departments[i].Name == department {
			dept = &conf.Departments[i]
			break
		}
	}
	if dept == nil {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Abteilung '%s' nicht gefunden", department)
	}

	groupIDs, err := a.resolveGroupIDs(dept.GroupIDs)
	if err != nil {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Gruppen konnten nicht aufgelöst werden: %w", err)
	}

	seen := make(map[int]bool)
	var trainers []TrainerRow

	// Fetch members page by page with nested customFields
	for _, gid := range groupIDs {
		urlStr := fmt.Sprintf("%s/member?limit=100&memberGroups=%d&query={id,membershipNumber,contactDetails{firstName,familyName,privatePhone,primaryEmail},customFields{id,value,customField{id}}}", baseURL, gid)

		for urlStr != "" {
			req, err := http.NewRequest("GET", urlStr, nil)
			if err != nil {
				return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler beim Erstellen des Requests: %w", err)
			}
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Accept", "application/json")

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler bei der API-Abfrage: %w", err)
			}

			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				return CachedData[[]TrainerRow]{}, fmt.Errorf("API lieferte Status %s: %s", resp.Status, string(bodyBytes))
			}

			var listResp trainerListResponse
			if err := json.Unmarshal(bodyBytes, &listResp); err != nil {
				return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler beim Entpacken der Antwort: %w", err)
			}

			for _, m := range listResp.Results {
				if seen[m.ID] {
					continue
				}
				seen[m.ID] = true

				// Check if member has trainer data
				isTrainer := false
				var row TrainerRow
				row.MemberID = m.ID
				row.MembershipNumber = m.MembershipNumber
				if m.ContactDetails != nil {
					row.FirstName = m.ContactDetails.FirstName
					row.FamilyName = m.ContactDetails.FamilyName
					row.Phone = m.ContactDetails.PrivatePhone
					row.Email = m.ContactDetails.PrimaryEmail
				}

				for _, cf := range m.CustomFields {
					val := strings.TrimSpace(cf.Value)
					switch cf.CustomField.ID {
					case FieldIDLizenzBGueltigBis:
						row.LizenzBGueltigBis = val
						row.LizenzBGueltigBisValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDLizenzCGueltigBis:
						row.LizenzCGueltigBis = val
						row.LizenzCGueltigBisValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDSporthelferGueltigAb:
						row.SporthelferGueltigAb = val
						row.SporthelferGueltigAbValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDLizenzBNachweis:
						row.LizenzBNachweis = val
						row.LizenzBNachweisValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDLizenzCNachweis:
						row.LizenzCNachweis = val
						row.LizenzCNachweisValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDSporthelfer:
						row.Sporthelfer = val
						row.SporthelferValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					case FieldIDUebungsleiterDesc:
						row.UebungsleiterDesc = val
						row.UebungsleiterDescValID = cf.ID
						if val != "" {
							isTrainer = true
						}
					}
				}

				if isTrainer {
					trainers = append(trainers, row)
				}
			}

			if listResp.Next != nil {
				urlStr = *listResp.Next
			} else {
				urlStr = ""
			}
		}
	}

	// Sort alphabetically by FamilyName, then FirstName
	sort.Slice(trainers, func(i, j int) bool {
		if trainers[i].FamilyName == trainers[j].FamilyName {
			return trainers[i].FirstName < trainers[j].FirstName
		}
		return trainers[i].FamilyName < trainers[j].FamilyName
	})

	res := CachedData[[]TrainerRow]{
		UpdatedAt: time.Now().Format(time.RFC3339),
		Data:      trainers,
	}

	a.mu.Lock()
	a.trainerCache["trainers_"+department] = res
	a.mu.Unlock()

	_ = saveToDiskCache(fmt.Sprintf("trainers_%s.json", department), res)

	return res, nil
}

// SelectTrainerFile opens a file selection dialog and returns the local file path.
func (a *App) SelectTrainerFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Nachweis-Datei auswählen",
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF, Bilddateien (*.pdf, *.jpg, *.jpeg, *.png)", Pattern: "*.pdf;*.jpg;*.jpeg;*.png"},
			{DisplayName: "Alle Dateien (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	return path, nil
}

// DownloadTrainerFile downloads a file from easyVerein and saves it locally.
func (a *App) DownloadTrainerFile(apiURL string, filename string) (string, error) {
	if apiURL == "" {
		return "", fmt.Errorf("Ungültige Download-URL")
	}

	a.mu.RLock()
	token := ""
	if a.extConf != nil {
		token = a.extConf.Vars.Token
	}
	a.mu.RUnlock()

	if token == "" {
		return "", fmt.Errorf("API-Token nicht bereit")
	}

	// Open Save Dialog
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Datei speichern unter",
		DefaultFilename: filename,
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil // Cancelled
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", fmt.Errorf("Fehler beim Erstellen des Download-Requests: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("Fehler beim Herunterladen der Datei: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Download failed with status %s: %s", resp.Status, string(body))
	}

	out, err := os.Create(path)
	if err != nil {
		return "", fmt.Errorf("Fehler beim Erstellen der lokalen Datei: %w", err)
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", fmt.Errorf("Fehler beim Schreiben der Datei: %w", err)
	}

	return path, nil
}

// saveTrainerCustomField helper function to save/update a single custom field value
func saveTrainerCustomField(ctx context.Context, token, baseURL string, memberID, fieldDefID, existingValID int, value string, localFilePath string) error {
	var err error
	
	// If a file needs to be uploaded
	if localFilePath != "" {
		err = uploadTrainerCustomFieldFile(ctx, token, baseURL, memberID, fieldDefID, existingValID, localFilePath)
	} else {
		// Normal text or date value update
		if existingValID != 0 {
			urlPatch := fmt.Sprintf("%s/member/%d/custom-fields/%d", baseURL, memberID, existingValID)
			jsonBody, _ := json.Marshal(map[string]string{"value": value})
			err = doCustomFieldRequest(ctx, token, "PATCH", urlPatch, jsonBody)
		} else {
			urlPost := fmt.Sprintf("%s/member/%d/custom-fields", baseURL, memberID)
			jsonBody, _ := json.Marshal(map[string]interface{}{
				"customField": fmt.Sprintf("%s/custom-field/%d", baseURL, fieldDefID),
				"value":       value,
				"userObject":  fmt.Sprintf("%s/member/%d", baseURL, memberID),
			})
			err = doCustomFieldRequest(ctx, token, "POST", urlPost, jsonBody)
		}
	}
	return err
}

func doCustomFieldRequest(ctx context.Context, token, method, urlStr string, body []byte) error {
	req, err := http.NewRequestWithContext(ctx, method, urlStr, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API response status %s: %s", resp.Status, string(bodyBytes))
	}
	return nil
}

func uploadTrainerCustomFieldFile(ctx context.Context, token, baseURL string, memberID, fieldDefID, existingValID int, localPath string) error {
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("lokale Datei konnte nicht geöffnet werden: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile("value", filepath.Base(localPath))
	if err != nil {
		return err
	}
	if _, err = io.Copy(part, file); err != nil {
		return err
	}

	method := "POST"
	urlStr := fmt.Sprintf("%s/member/%d/custom-fields", baseURL, memberID)
	
	if existingValID != 0 {
		method = "PATCH"
		urlStr = fmt.Sprintf("%s/member/%d/custom-fields/%d", baseURL, memberID, existingValID)
	} else {
		_ = writer.WriteField("customField", fmt.Sprintf("%s/custom-field/%d", baseURL, fieldDefID))
		_ = writer.WriteField("userObject", fmt.Sprintf("%s/member/%d", baseURL, memberID))
	}

	if err = writer.Close(); err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API response status %s: %s", resp.Status, string(bodyBytes))
	}
	return nil
}

// fetchMemberCustomFields retrieves all existing custom fields for a member and maps customFieldDefID -> valueID
func (a *App) fetchMemberCustomFields(memberID int) (map[int]int, error) {
	a.mu.RLock()
	token := ""
	baseURL := ""
	if a.extConf != nil {
		token = a.extConf.Vars.Token
		baseURL = a.extConf.Vars.BaseURL
	}
	a.mu.RUnlock()

	if token == "" || baseURL == "" {
		return nil, fmt.Errorf("API-Verbindung nicht bereit")
	}

	urlStr := fmt.Sprintf("%s/member/%d?query={customFields{id,customField{id}}}", baseURL, memberID)
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Status %s: %s", resp.Status, string(body))
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	var m struct {
		CustomFields []struct {
			ID          int `json:"id"`
			CustomField struct {
				ID int `json:"id"`
			} `json:"customField"`
		} `json:"customFields"`
	}
	if err := json.Unmarshal(bodyBytes, &m); err != nil {
		return nil, err
	}

	fieldMap := make(map[int]int)
	for _, cf := range m.CustomFields {
		fieldMap[cf.CustomField.ID] = cf.ID
	}
	return fieldMap, nil
}

// SaveTrainer saves trainer data to easyVerein.
func (a *App) SaveTrainer(department string, row TrainerRow, localFiles map[string]string) (CachedData[[]TrainerRow], error) {
	a.mu.RLock()
	token := ""
	baseURL := ""
	if a.extConf != nil {
		token = a.extConf.Vars.Token
		baseURL = a.extConf.Vars.BaseURL
	}
	a.mu.RUnlock()

	if token == "" || baseURL == "" {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("API-Verbindung nicht bereit")
	}

	memberID := row.MemberID
	if memberID == 0 {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Mitglieds-ID fehlt")
	}

	// Dynamic lookup of existing custom field value IDs
	fieldMap, err := a.fetchMemberCustomFields(memberID)
	if err != nil {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler beim Abrufen der Custom Fields: %w", err)
	}

	// Map fields to definition IDs, existing value IDs, values, and local file paths
	type saveItem struct {
		fieldDefID    int
		existingValID int
		value         string
		localPath     string
	}

	items := []saveItem{
		{FieldIDLizenzBGueltigBis, fieldMap[FieldIDLizenzBGueltigBis], row.LizenzBGueltigBis, ""},
		{FieldIDLizenzCGueltigBis, fieldMap[FieldIDLizenzCGueltigBis], row.LizenzCGueltigBis, ""},
		{FieldIDSporthelferGueltigAb, fieldMap[FieldIDSporthelferGueltigAb], row.SporthelferGueltigAb, ""},
		{FieldIDUebungsleiterDesc, fieldMap[FieldIDUebungsleiterDesc], row.UebungsleiterDesc, ""},
		{FieldIDLizenzBNachweis, fieldMap[FieldIDLizenzBNachweis], row.LizenzBNachweis, localFiles[strconv.Itoa(FieldIDLizenzBNachweis)]},
		{FieldIDLizenzCNachweis, fieldMap[FieldIDLizenzCNachweis], row.LizenzCNachweis, localFiles[strconv.Itoa(FieldIDLizenzCNachweis)]},
		{FieldIDSporthelfer, fieldMap[FieldIDSporthelfer], row.Sporthelfer, localFiles[strconv.Itoa(FieldIDSporthelfer)]},
	}

	for _, item := range items {
		// Skip file fields if no new file is chosen AND the value has not been cleared
		if (item.fieldDefID == FieldIDLizenzBNachweis || item.fieldDefID == FieldIDLizenzCNachweis || item.fieldDefID == FieldIDSporthelfer) &&
			item.localPath == "" && item.value != "" {
			continue
		}

		err := saveTrainerCustomField(a.ctx, token, baseURL, memberID, item.fieldDefID, item.existingValID, item.value, item.localPath)
		if err != nil {
			return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler beim Speichern des Feldes %d: %w", item.fieldDefID, err)
		}
	}

	return a.ReloadTrainers(department)
}

// DeleteTrainer removes all trainer data from a member's profile.
func (a *App) DeleteTrainer(department string, memberID int) (CachedData[[]TrainerRow], error) {
	a.mu.RLock()
	token := ""
	baseURL := ""
	if a.extConf != nil {
		token = a.extConf.Vars.Token
		baseURL = a.extConf.Vars.BaseURL
	}
	a.mu.RUnlock()

	if token == "" || baseURL == "" {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("API-Verbindung nicht bereit")
	}

	fieldMap, err := a.fetchMemberCustomFields(memberID)
	if err != nil {
		return CachedData[[]TrainerRow]{}, fmt.Errorf("Fehler beim Abrufen der Custom Fields: %w", err)
	}

	trainerFieldIDs := []int{
		FieldIDLizenzBGueltigBis,
		FieldIDLizenzCGueltigBis,
		FieldIDSporthelferGueltigAb,
		FieldIDLizenzBNachweis,
		FieldIDLizenzCNachweis,
		FieldIDSporthelfer,
		FieldIDUebungsleiterDesc,
	}

	for _, fieldDefID := range trainerFieldIDs {
		valID := fieldMap[fieldDefID]
		if valID == 0 {
			continue
		}
		urlPatch := fmt.Sprintf("%s/member/%d/custom-fields/%d", baseURL, memberID, valID)
		jsonBody, _ := json.Marshal(map[string]string{"value": ""})
		_ = doCustomFieldRequest(a.ctx, token, "PATCH", urlPatch, jsonBody)
	}

	return a.ReloadTrainers(department)
}
