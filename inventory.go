package main

import (
	"fmt"
	"sort"
)

// InventoryItemRow is a flat representation of an inventory item for the frontend.
type InventoryItemRow struct {
	ID               int     `json:"id"`
	Name             string  `json:"name"`
	Identifier       string  `json:"identifier"`
	Description      string  `json:"description"`
	Pieces           int     `json:"pieces"`
	Price            float64 `json:"price"`
	PurchaseDate     string  `json:"purchaseDate"`
	LocationName     string  `json:"locationName"`
	LendingAvailable bool    `json:"lendingAvailable"`
}

// InventoryGroupRow is a flat representation of an inventory group for the frontend.
type InventoryGroupRow struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ItemCount   int    `json:"itemCount"`
}

// LocationRow is a flat representation of a location for the frontend.
type LocationRow struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Street      string `json:"street"`
	City        string `json:"city"`
	Zip         string `json:"zip"`
	Country     string `json:"country"`
}

// InventoryOverview holds the aggregated data for the inventory module.
type InventoryOverview struct {
	Items     []InventoryItemRow  `json:"items"`
	Groups    []InventoryGroupRow `json:"groups"`
	Locations []LocationRow       `json:"locations"`
}

// GetInventoryOverview returns the cached inventory data or fetches it if empty.
func (a *App) GetInventoryOverview() (InventoryOverview, error) {
	a.mu.RLock()
	cached := a.inventoryCache
	a.mu.RUnlock()

	if cached != nil {
		return *cached, nil
	}

	return a.loadInventoryData()
}

// ReloadInventory clears the cache and fetches fresh inventory data.
func (a *App) ReloadInventory() (InventoryOverview, error) {
	a.mu.Lock()
	a.inventoryCache = nil
	a.mu.Unlock()
	return a.loadInventoryData()
}

func (a *App) loadInventoryData() (InventoryOverview, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()

	if client == nil {
		return InventoryOverview{}, fmt.Errorf("API-Client nicht initialisiert (kein Token)")
	}

	var overview InventoryOverview

	// Fetch Locations
	locations, err := client.Locations.ListAll(a.ctx, nil)
	if err != nil {
		return overview, fmt.Errorf("Orte konnten nicht geladen werden: %w", err)
	}

	for _, loc := range locations {
		overview.Locations = append(overview.Locations, LocationRow{
			ID:          loc.ID,
			Name:        loc.Name,
			Description: loc.Description,
			Street:      loc.Street,
			City:        loc.City,
			Zip:         loc.Zip,
			Country:     loc.Country,
		})
	}

	// Fetch Inventory Groups
	groups, err := client.InventoryObjectGroups.ListAll(a.ctx, nil)
	if err != nil {
		return overview, fmt.Errorf("Inventargruppen konnten nicht geladen werden: %w", err)
	}

	for _, g := range groups {
		overview.Groups = append(overview.Groups, InventoryGroupRow{
			ID:          g.ID,
			Name:        g.Name,
			Description: g.Description,
			ItemCount:   len(g.InventoryObjects),
		})
	}

	// Fetch Inventory Objects
	items, err := client.InventoryObjects.ListAll(a.ctx, nil)
	if err != nil {
		return overview, fmt.Errorf("Inventar-Items konnten nicht geladen werden: %w", err)
	}

	for _, it := range items {
		overview.Items = append(overview.Items, InventoryItemRow{
			ID:               it.ID,
			Name:             it.Name,
			Identifier:       it.Identifier,
			Description:      it.Description,
			Pieces:           it.Pieces,
			Price:            float64(it.Price),
			PurchaseDate:     dateOnly(it.PurchaseDate),
			LocationName:     it.LocationName,
			LendingAvailable: it.LendingAvailable,
		})
	}

	// Sort lists alphabetically by Name
	sort.Slice(overview.Locations, func(i, j int) bool { return overview.Locations[i].Name < overview.Locations[j].Name })
	sort.Slice(overview.Groups, func(i, j int) bool { return overview.Groups[i].Name < overview.Groups[j].Name })
	sort.Slice(overview.Items, func(i, j int) bool { return overview.Items[i].Name < overview.Items[j].Name })

	a.mu.Lock()
	a.inventoryCache = &overview
	a.mu.Unlock()

	return overview, nil
}
