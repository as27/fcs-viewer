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
	"github.com/as27/easyvapi/model"
	"gopkg.in/yaml.v3"
)

const externalConfigURL = "https://as27.github.io/fcspichdata/extern_conf.yaml.age"

// ExternalConfig represents the decrypted YAML configuration.
type ExternalConfig struct {
	Version     string       `yaml:"version"`
	GeneratedAt string       `yaml:"generated_at"`
	Departments []Department `yaml:"departments"`
	Vars        struct {
		BaseURL string `yaml:"base_url"`
		Token   string `yaml:"token"`
	} `yaml:"vars"`
}

// Department maps a name to a list of group short IDs.
type Department struct {
	Name     string   `yaml:"name"`
	GroupIDs []string `yaml:"group_ids"`
}

// MemberRow is a flat representation of a member for the frontend.
type MemberRow struct {
	ID               int    `json:"id"`
	MembershipNumber string `json:"membershipNumber"`
	FirstName        string `json:"firstName"`
	FamilyName       string `json:"familyName"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Mobile           string `json:"mobile"`
	DateOfBirth      string `json:"dateOfBirth"`
	Street           string `json:"street"`
	Zip              string `json:"zip"`
	City             string `json:"city"`
	JoinDate         string `json:"joinDate"`
	Groups           string `json:"groups"`
}

// Settings holds the current app settings for the frontend.
type Settings struct {
	PublicKey   string `json:"publicKey"`
	BaseURL     string `json:"baseURL"`
	TokenMasked string `json:"tokenMasked"`
	ConfigURL   string `json:"configURL"`
	ConfigError string `json:"configError"`
}

// App is the main Wails application struct.
type App struct {
	ctx    context.Context
	loader *ageloader.Loader

	mu         sync.RWMutex
	extConf    *ExternalConfig
	confErr    string
	apiClient  *easyvapi.Client
	memberCache map[string][]MemberRow // key: department name
}

// NewApp creates a new App.
func NewApp() *App {
	return &App{
		memberCache: make(map[string][]MemberRow),
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

	a.mu.Lock()
	a.extConf = &conf
	a.confErr = ""
	if conf.Vars.Token != "" {
		a.apiClient = easyvapi.New(conf.Vars.Token,
			easyvapi.WithBaseURL(conf.Vars.BaseURL))
	}
	a.mu.Unlock()
}

// GetSettings returns the current settings for display in the frontend.
func (a *App) GetSettings() Settings {
	s := Settings{
		ConfigURL: externalConfigURL,
	}

	if a.loader != nil {
		s.PublicKey = a.loader.PublicKey()
	}

	a.mu.RLock()
	defer a.mu.RUnlock()

	s.ConfigError = a.confErr
	if a.extConf != nil {
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
	names := make([]string, len(a.extConf.Departments))
	for i, d := range a.extConf.Departments {
		names[i] = d.Name
	}
	return names
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

	// Find the department
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

	// Resolve group short names to integer IDs
	groupIDs, err := a.resolveGroupIDs(dept.GroupIDs)
	if err != nil {
		return nil, fmt.Errorf("Gruppen konnten nicht aufgelöst werden: %w", err)
	}

	// Fetch members
	opts := &easyvapi.MemberListOptions{
		MemberGroups: groupIDs,
	}
	members, err := client.Members.ListAll(a.ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("Mitglieder konnten nicht geladen werden: %w", err)
	}

	rows := make([]MemberRow, 0, len(members))
	for _, m := range members {
		rows = append(rows, memberToRow(m))
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

func memberToRow(m model.Member) MemberRow {
	var groups []string
	for _, mg := range m.MemberGroups {
		if mg.Name != "" {
			groups = append(groups, mg.Name)
		}
	}

	cd := m.ContactDetails
	return MemberRow{
		ID:               m.ID,
		MembershipNumber: m.MembershipNumber,
		FirstName:        cd.FirstName,
		FamilyName:       cd.FamilyName,
		Email:            cd.PrimaryEmail,
		Phone:            cd.PrivatePhone,
		Mobile:           cd.MobilePhone,
		DateOfBirth:      cd.DateOfBirth,
		Street:           cd.Street,
		Zip:              cd.Zip,
		City:             cd.City,
		JoinDate:         m.JoinDate,
		Groups:           strings.Join(groups, ", "),
	}
}
