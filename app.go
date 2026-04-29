package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/as27/ageloader"
	"github.com/as27/easyvapi"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

const externalConfigURL = "https://as27.github.io/fcspichdata/extern_conf.yaml.age"

const AppVersion = "1.0.1"

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

// App is the main Wails application struct.
type App struct {
	ctx    context.Context
	loader *ageloader.Loader

	mu                sync.RWMutex
	extConf           *ExternalConfig
	confErr           string
	apiClient         *easyvapi.Client
	memberCache       map[string][]MemberRow
	invoiceCache      map[string][]InvoiceRow
	activeModules     []string
	activeDepartments []string
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{
		memberCache:  make(map[string][]MemberRow),
		invoiceCache: make(map[string][]InvoiceRow),
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

	a.loadExternalConfig()
}

// ReloadConfig forces a fresh download of the external configuration and
// reinitialises the API client. Returns the updated Settings.
func (a *App) ReloadConfig() Settings {
	if a.loader != nil {
		_ = a.loader.Invalidate(externalConfigURL)
	}
	a.mu.Lock()
	a.memberCache = make(map[string][]MemberRow)
	a.invoiceCache = make(map[string][]InvoiceRow)
	a.mu.Unlock()

	a.loadExternalConfig()
	return a.GetSettings()
}

func (a *App) loadExternalConfig() {
	if a.loader == nil {
		return
	}
	rc, err := a.loader.Open(a.ctx, externalConfigURL, false)
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
	if a.loader != nil {
		pubKey := a.loader.PublicKey()
		for _, entry := range conf.Keys {
			if entry.PublicKey == pubKey {
				activeModules = entry.Modules
				activeDepartments = entry.Departments
				break
			}
		}
	}
	if len(activeModules) == 0 {
		activeModules = conf.Modules
	}

	a.mu.Lock()
	a.extConf = &conf
	a.confErr = ""
	a.activeModules = activeModules
	a.activeDepartments = activeDepartments
	if conf.Vars.Token != "" {
		a.apiClient = easyvapi.New(conf.Vars.Token,
			easyvapi.WithBaseURL(conf.Vars.BaseURL))
	}
	a.mu.Unlock()
}

// GetSettings returns the current settings for display in the frontend.
func (a *App) GetSettings() Settings {
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
