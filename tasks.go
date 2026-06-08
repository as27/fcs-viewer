package main

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/as27/easyvapi"
	"github.com/as27/easyvapi/model"
)

// GetTasksOverview returns the cached tasks data or fetches it if empty.
func (a *App) GetTasksOverview() (CachedData[TaskOverview], error) {
	a.mu.RLock()
	cached := a.taskCache
	a.mu.RUnlock()

	if cached != nil && cached.IsValid() {
		return *cached, nil
	}

	var diskCache CachedData[TaskOverview]
	err := loadFromDiskCache("tasks.json", &diskCache)
	if err == nil && diskCache.IsValid() {
		a.mu.Lock()
		a.taskCache = &diskCache
		a.mu.Unlock()
		return diskCache, nil
	}

	return a.loadTasksData()
}

// ReloadTasks clears the cache and fetches fresh tasks data.
func (a *App) ReloadTasks() (CachedData[TaskOverview], error) {
	a.mu.Lock()
	a.taskCache = nil
	a.mu.Unlock()
	return a.loadTasksData()
}

func (a *App) loadTasksData() (CachedData[TaskOverview], error) {
	client, err := a.getAPIClient()
	if err != nil {
		return CachedData[TaskOverview]{}, err
	}

	var overview TaskOverview

	tasks, err := client.Tasks.ListAll(a.ctx, nil)
	if err != nil {
		return CachedData[TaskOverview]{}, fmt.Errorf("Aufgaben konnten nicht geladen werden: %w", err)
	}

	for _, t := range tasks {
		row := TaskRow{
			ID:            t.ID,
			Name:          t.Name,
			Description:   t.Description,
			Due:           "",
			State:         t.State,
			Public:        t.Public,
			TaskGroupID:   0,
			ParentEventID: 0,
		}
		if t.Due != nil {
			row.Due = dateOnly(*t.Due)
		}
		if t.Member != nil {
			row.Member = *t.Member
		}
		if t.TaskGroup != nil {
			row.TaskGroup = *t.TaskGroup
			row.TaskGroupID = extractID(*t.TaskGroup)
		}
		if t.ParentEvent != nil {
			row.ParentEvent = *t.ParentEvent
			row.ParentEventID = extractID(*t.ParentEvent)
		}
		overview.Tasks = append(overview.Tasks, row)
	}

	// Sort by due date (oldest first, empty last)
	sort.Slice(overview.Tasks, func(i, j int) bool {
		if overview.Tasks[i].Due == "" {
			return false
		}
		if overview.Tasks[j].Due == "" {
			return true
		}
		return overview.Tasks[i].Due < overview.Tasks[j].Due
	})

	res := CachedData[TaskOverview]{
		UpdatedAt: time.Now().Format(time.RFC3339),
		Data:      overview,
	}

	a.mu.Lock()
	a.taskCache = &res
	a.mu.Unlock()

	_ = saveToDiskCache("tasks.json", res)

	return res, nil
}

func extractID(apiURL string) int {
	if apiURL == "" {
		return 0
	}
	s := strings.Trim(apiURL, "/")
	parts := strings.Split(s, "/")
	if len(parts) == 0 {
		return 0
	}
	last := parts[len(parts)-1]
	var res int
	fmt.Sscanf(last, "%d", &res)
	return res
}

// GetTaskMetadata fetches available TaskGroups and Events for the task form.
func (a *App) GetTaskMetadata() (TaskMetadata, error) {
	client, err := a.getAPIClient()
	if err != nil {
		return TaskMetadata{}, err
	}

	var meta TaskMetadata

	// Fetch Task Groups
	groups, err := client.TaskGroups.ListAll(a.ctx, nil)
	if err == nil {
		for _, g := range groups {
			meta.TaskGroups = append(meta.TaskGroups, TaskMetadataItem{
				ID:   g.ID,
				Name: g.Name,
			})
		}
	}

	// Fetch Events (last 3 months and future)
	threeMonthsAgo := time.Now().AddDate(0, -3, 0).Format("2006-01-02T00:00:00Z")
	events, err := client.Events.ListAll(a.ctx, &easyvapi.EventListOptions{
		StartGte: threeMonthsAgo,
	})
	if err == nil {
		for _, e := range events {
			meta.Events = append(meta.Events, TaskMetadataItem{
				ID:   e.ID,
				Name: e.Name,
				Date: dateOnly(e.Start),
			})
		}
	}

	return meta, nil
}

// SaveTask creates a new task or updates an existing one.
func (a *App) SaveTask(row TaskRow) (CachedData[TaskOverview], error) {
	client, err := a.getAPIClient()
	if err != nil {
		return CachedData[TaskOverview]{}, err
	}

	tc := model.TaskCreate{
		Name:        row.Name,
		Description: row.Description,
		State:       row.State,
		Public:      &row.Public,
	}

	if row.Due != "" {
		due := row.Due // Already YYYY-MM-DD
		tc.Due = &due
	}

	fmt.Printf("DEBUG: Saving task ID=%d Name=%s State=%s Due=%v\n", row.ID, row.Name, row.State, tc.Due)

	if row.TaskGroupID != 0 {
		tc.TaskGroup = &row.TaskGroupID
	}
	if row.ParentEventID != 0 {
		tc.ParentEvent = &row.ParentEventID
	}

	if row.ID == 0 {
		_, err = client.Tasks.Create(a.ctx, tc)
	} else {
		_, err = client.Tasks.Update(a.ctx, row.ID, tc)
	}

	if err != nil {
		return CachedData[TaskOverview]{}, err
	}

	return a.ReloadTasks()
}

// DeleteTask deletes the task with the given ID.
func (a *App) DeleteTask(id int) (CachedData[TaskOverview], error) {
	client, err := a.getAPIClient()
	if err != nil {
		return CachedData[TaskOverview]{}, err
	}

	err = client.Tasks.Delete(a.ctx, id)
	if err != nil {
		return CachedData[TaskOverview]{}, err
	}

	return a.ReloadTasks()
}
