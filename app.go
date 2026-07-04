package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/as27/ageloader"
	"github.com/as27/easyvapi"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

const externalConfigURL = "https://as27.github.io/fcspichdata/extern_conf.yaml.age"

const AppVersion = "1.0.10"

// KeyEntry represents a single key entry in the external configuration.
type KeyEntry struct {
	Name        string   `yaml:"name"`
	Tool        string   `yaml:"tool"`
	PublicKey   string   `yaml:"public_key"`
	Departments []string `yaml:"departments"`
	Modules     []string `yaml:"modules"`
}

// ExternalConfig represents the decrypted YAML configuration.
type ExternalConfig struct {
	Version     string       `yaml:"version"`
	GeneratedAt string       `yaml:"generated_at"`
	Departments []Department `yaml:"departments"`
	Modules     []string     `yaml:"modules"`
	Keys        map[string]KeyEntry `yaml:"keys"`
	Vars        struct {
		BaseURL string `yaml:"base_url"`
		Token   string `yaml:"token"`
	} `yaml:"vars"`
}

// Department maps a name to a list of group short IDs.
type Department struct {
	Name           string   `yaml:"name"`
	GroupIDs       []string `yaml:"group_ids"`
	BankAccountIDs []int    `yaml:"bank_account_ids"`
}

// TaskRow is a flat representation of a task for the frontend.
type TaskRow struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Due           string `json:"due"`
	State         string `json:"state"`
	Public        bool   `json:"public"`
	Member        string `json:"member"`        // URL or name
	TaskGroup     string `json:"taskGroup"`     // URL or name
	TaskGroupID   int    `json:"taskGroupID"`   // ID for selection
	ParentEvent   string `json:"parentEvent"`   // URL or name
	ParentEventID int    `json:"parentEventID"` // ID for selection
}

// TaskMetadataItem is used for dropdown selections.
type TaskMetadataItem struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Date string `json:"date,omitempty"`
}

// TaskMetadata holds lists for task form selections.
type TaskMetadata struct {
	TaskGroups []TaskMetadataItem `json:"taskGroups"`
	Events     []TaskMetadataItem `json:"events"`
}

// ProtocolRow is a flat representation of a protocol for the frontend.
type ProtocolRow struct {
	ID               int    `json:"id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	LocationName     string `json:"locationName"`
	Start            string `json:"start"`
	End              string `json:"end"`
	MeetingLeader    string `json:"meetingLeader"`
	MeetingSecretary string `json:"meetingSecretary"`
}

// TaskOverview holds aggregated task data.
type TaskOverview struct {
	Tasks []TaskRow `json:"tasks"`
}

// ProtocolOverview holds aggregated protocol data.
type ProtocolOverview struct {
	Protocols []ProtocolRow `json:"protocols"`
}

// Settings holds the current app settings for the frontend.
type Settings struct {
	Version       string   `json:"version"`
	PublicKey     string   `json:"publicKey"`
	BaseURL       string   `json:"baseURL"`
	TokenMasked   string   `json:"tokenMasked"`
	ConfigURL     string   `json:"configURL"`
	ConfigError   string   `json:"configError"`
	ActiveModules []string `json:"activeModules"`
}

// CachedData represents data stored in the disk cache with an expiration timestamp.
type CachedData[T any] struct {
	UpdatedAt string `json:"updatedAt"`
	Data      T      `json:"data"`
}

// IsValid checks if the cached data is less than 1 week old.
func (c CachedData[T]) IsValid() bool {
	t, err := time.Parse(time.RFC3339, c.UpdatedAt)
	if err != nil {
		return false
	}
	return time.Since(t) < 7*24*time.Hour
}

func saveToDiskCache(filename string, data interface{}) error {
	path := filepath.Join(configDir(), "cache", filename)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}

func loadFromDiskCache(filename string, dest interface{}) error {
	path := filepath.Join(configDir(), "cache", filename)
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dest)
}

// App is the main Wails application struct.
type App struct {
	ctx    context.Context
	loader *ageloader.Loader

	mu                sync.RWMutex
	extConf           *ExternalConfig
	confErr           string
	apiClient         *easyvapi.Client
	memberCache       map[string]CachedData[[]MemberRow]
	invoiceCache      map[string]CachedData[[]InvoiceRow]
	inventoryCache    *CachedData[InventoryOverview]
	taskCache         *CachedData[TaskOverview]
	protocolCache     *CachedData[ProtocolOverview]
	activeModules     []string
	activeDepartments []string

	configLoadMu   sync.Mutex
	lastConfigLoad time.Time
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{
		memberCache:  make(map[string]CachedData[[]MemberRow]),
		invoiceCache: make(map[string]CachedData[[]InvoiceRow]),
	}
}

func configDir() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = "."
	}
	return filepath.Join(dir, "fcs-viewer")
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	cfgDir := configDir()
	keyPath := filepath.Join(cfgDir, "identity.age")
	cacheDir := filepath.Join(cfgDir, "cache")

	loader, err := ageloader.New(keyPath, cacheDir)
	if err != nil {
		a.confErr = fmt.Sprintf("Fehler beim Initialisieren des Schlüssels: %v", err)
		return
	}
	a.loader = loader

	a.loadExternalConfig(false)
}

// ReloadConfig forces a fresh download of the external configuration and
// reinitialises the API client. Returns the updated Settings.
func (a *App) ReloadConfig() Settings {
	if a.loader != nil {
		_ = a.loader.Invalidate(externalConfigURL)
	}
	a.mu.Lock()
	a.memberCache = make(map[string]CachedData[[]MemberRow])
	a.invoiceCache = make(map[string]CachedData[[]InvoiceRow])
	a.inventoryCache = nil
	a.taskCache = nil
	a.protocolCache = nil
	a.mu.Unlock()

	a.loadExternalConfig(true)
	return a.GetSettings()
}

func (a *App) loadExternalConfig(force bool) {
	a.configLoadMu.Lock()
	defer a.configLoadMu.Unlock()
	a.loadExternalConfigLocked(force)
}

func (a *App) loadExternalConfigLocked(force bool) {
	a.mu.RLock()
	hasConf := a.extConf != nil
	lastLoad := a.lastConfigLoad
	a.mu.RUnlock()

	if hasConf && !force && time.Since(lastLoad) < 1*time.Hour {
		return
	}

	if a.loader == nil {
		return
	}
	rc, err := a.loader.Open(a.ctx, externalConfigURL, force)
	if err != nil {
		a.mu.Lock()
		a.confErr = fmt.Sprintf("Externe Konfiguration konnte nicht geladen werden: %v", err)
		a.mu.Unlock()
		return
	}
	defer rc.Close()

	var conf ExternalConfig
	if err := yaml.NewDecoder(rc).Decode(&conf); err != nil {
		a.mu.Lock()
		a.confErr = fmt.Sprintf("Fehler beim Parsen der Konfiguration: %v", err)
		a.mu.Unlock()
		return
	}

	var activeModules, activeDepartments []string
	pubKey := a.loader.PublicKey()
	for _, entry := range conf.Keys {
		if entry.PublicKey == pubKey {
			activeModules = entry.Modules
			activeDepartments = entry.Departments
			break
		}
	}
	if len(activeModules) == 0 {
		activeModules = conf.Modules
	}

	a.mu.Lock()
	a.extConf = &conf
	a.lastConfigLoad = time.Now()
	a.confErr = ""
	a.activeModules = activeModules
	a.activeDepartments = activeDepartments
	if conf.Vars.Token != "" {
		transport := &retryRoundTripper{
			app:  a,
			base: http.DefaultTransport,
		}
		httpClient := &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		}
		a.apiClient = easyvapi.New(conf.Vars.Token,
			easyvapi.WithBaseURL(conf.Vars.BaseURL),
			easyvapi.WithHTTPClient(httpClient))
	}
	a.mu.Unlock()
}

// getAPIClient reloads the configuration and returns the up-to-date API client.
func (a *App) getAPIClient() (*easyvapi.Client, error) {
	a.loadExternalConfig(false)
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.apiClient == nil {
		return nil, fmt.Errorf("API-Client ist nicht initialisiert (Konfigurationsfehler)")
	}
	return a.apiClient, nil
}

// GetSettings returns the current settings for display in the frontend.
func (a *App) GetSettings() Settings {
	a.loadExternalConfig(false)
	s := Settings{
		Version:   AppVersion,
		ConfigURL: externalConfigURL,
	}

	if a.loader != nil {
		s.PublicKey = a.loader.PublicKey()
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	s.ConfigError = a.confErr
	if a.extConf != nil {
		s.ActiveModules = a.activeModules
		s.BaseURL = a.extConf.Vars.BaseURL
		tok := a.extConf.Vars.Token
		if len(tok) > 8 {
			s.TokenMasked = tok[:4] + strings.Repeat("*", len(tok)-8) + tok[len(tok)-4:]
		} else {
			s.TokenMasked = strings.Repeat("*", len(tok))
		}
	}
	return s
}

// GetDepartments returns the list of department names from the external config.
func (a *App) GetDepartments() []string {
	a.loadExternalConfig(false)
	a.mu.RLock()
	defer a.mu.RUnlock()

	if a.extConf == nil {
		return nil
	}
	filter := make(map[string]bool, len(a.activeDepartments))
	for _, n := range a.activeDepartments {
		filter[n] = true
	}
	var names []string
	for _, d := range a.extConf.Departments {
		if len(filter) == 0 || filter[d.Name] {
			names = append(names, d.Name)
		}
	}
	return names
}

// ExportPublicKey opens a save-file dialog and writes the public key to the chosen file.
func (a *App) ExportPublicKey() (string, error) {
	if a.loader == nil {
		return "", fmt.Errorf("Schlüssel noch nicht initialisiert")
	}
	pubKey := a.loader.PublicKey()
	if pubKey == "" {
		return "", fmt.Errorf("Kein Public Key vorhanden")
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Public Key speichern",
		DefaultFilename: "fcs-viewer-pubkey.txt",
		Filters: []runtime.FileFilter{
			{DisplayName: "Textdateien (*.txt)", Pattern: "*.txt"},
			{DisplayName: "Alle Dateien (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return "", fmt.Errorf("Dialog-Fehler: %w", err)
	}
	if path == "" {
		return "", nil
	}

	if err := os.WriteFile(path, []byte(pubKey+"\n"), 0o644); err != nil {
		return "", fmt.Errorf("Datei konnte nicht gespeichert werden: %w", err)
	}
	return path, nil
}

// ConfirmDeletion shows a native confirmation dialog and returns true if the user confirmed.
func (a *App) ConfirmDeletion(title, message string) (bool, error) {
	selection, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         title,
		Message:       message,
		Buttons:       []string{"Ja", "Nein"},
		DefaultButton: "Ja",
		CancelButton:  "Nein",
	})
	if err != nil {
		return false, err
	}
	return selection == "Ja", nil
}

type retryRoundTripper struct {
	app  *App
	base http.RoundTripper
}

func (rt *retryRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := rt.base.RoundTrip(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusUnauthorized && req.Header.Get("X-FCS-Retry") != "true" {
		resp.Body.Close()

		oldToken := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
		newToken := rt.app.reloadConfigOnUnauthorized(oldToken)

		if newToken != "" {
			newReq := req.Clone(req.Context())
			newReq.Header.Set("Authorization", "Bearer "+newToken)
			newReq.Header.Set("X-FCS-Retry", "true")
			if req.GetBody != nil {
				body, err := req.GetBody()
				if err == nil {
					newReq.Body = body
				}
			}
			return rt.base.RoundTrip(newReq)
		}
	}

	return resp, nil
}

func (a *App) reloadConfigOnUnauthorized(oldToken string) string {
	a.configLoadMu.Lock()
	defer a.configLoadMu.Unlock()

	a.mu.RLock()
	var currentToken string
	if a.extConf != nil {
		currentToken = a.extConf.Vars.Token
	}
	a.mu.RUnlock()

	// If the token has already changed in memory, another parallel request already updated it
	if currentToken != oldToken {
		return currentToken
	}

	// Force invalidate cache and reload the external config from URL
	if a.loader != nil {
		_ = a.loader.Invalidate(externalConfigURL)
	}
	a.loadExternalConfigLocked(true)

	a.mu.RLock()
	if a.extConf != nil {
		currentToken = a.extConf.Vars.Token
	}
	a.mu.RUnlock()

	return currentToken
}
