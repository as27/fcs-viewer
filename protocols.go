package main

import (
	"fmt"
	"sort"
	"time"
)

// GetProtocolsOverview returns the cached protocols data or fetches it if empty.
func (a *App) GetProtocolsOverview() (CachedData[ProtocolOverview], error) {
	a.mu.RLock()
	cached := a.protocolCache
	a.mu.RUnlock()

	if cached != nil && cached.IsValid() {
		return *cached, nil
	}

	var diskCache CachedData[ProtocolOverview]
	err := loadFromDiskCache("protocols.json", &diskCache)
	if err == nil && diskCache.IsValid() {
		a.mu.Lock()
		a.protocolCache = &diskCache
		a.mu.Unlock()
		return diskCache, nil
	}

	return a.loadProtocolsData()
}

// ReloadProtocols clears the cache and fetches fresh protocols data.
func (a *App) ReloadProtocols() (CachedData[ProtocolOverview], error) {
	a.mu.Lock()
	a.protocolCache = nil
	a.mu.Unlock()
	return a.loadProtocolsData()
}

func (a *App) loadProtocolsData() (CachedData[ProtocolOverview], error) {
	client, err := a.getAPIClient()
	if err != nil {
		return CachedData[ProtocolOverview]{}, err
	}

	var overview ProtocolOverview

	protocols, err := client.Protocols.ListAll(a.ctx, nil)
	if err != nil {
		return CachedData[ProtocolOverview]{}, fmt.Errorf("Protokolle konnten nicht geladen werden: %w", err)
	}

	for _, p := range protocols {
		overview.Protocols = append(overview.Protocols, ProtocolRow{
			ID:               p.ID,
			Name:             p.Name,
			Description:      p.Description,
			LocationName:     p.LocationName,
			Start:            dateOnly(p.Start),
			End:              dateOnly(p.End),
			MeetingLeader:    p.MeetingLeader,
			MeetingSecretary: p.MeetingSecretary,
		})
	}

	// Sort by start date (newest first)
	sort.Slice(overview.Protocols, func(i, j int) bool {
		return overview.Protocols[i].Start > overview.Protocols[j].Start
	})

	res := CachedData[ProtocolOverview]{
		UpdatedAt: time.Now().Format(time.RFC3339),
		Data:      overview,
	}

	a.mu.Lock()
	a.protocolCache = &res
	a.mu.Unlock()

	_ = saveToDiskCache("protocols.json", res)

	return res, nil
}
