package main

import (
	"fmt"
	"strconv"
	"time"

	"github.com/as27/easyvapi"
)

// CalendarInfo is a slim calendar descriptor for the frontend.
type CalendarInfo struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// CalendarEvent is a unified event/birthday record for the calendar view.
type CalendarEvent struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Start        string `json:"start"`
	End          string `json:"end"`
	AllDay       bool   `json:"allDay"`
	CalendarID   int    `json:"calendarId"`
	CalendarName string `json:"calendarName"`
	Color        string `json:"color"`
	Type         string `json:"type"` // "event" | "birthday"
}

// GetCalendars returns all calendars from the easyVerein API.
func (a *App) GetCalendars() ([]CalendarInfo, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}
	cals, err := client.Calendars.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Kalender konnten nicht geladen werden: %w", err)
	}
	result := make([]CalendarInfo, len(cals))
	for i, c := range cals {
		color := c.Color
		if color == "" {
			color = "#6366f1"
		}
		result[i] = CalendarInfo{ID: c.ID, Name: c.Name, Color: color}
	}
	return result, nil
}

// GetCalendarEvents returns all events and (optionally) member birthdays for the
// given year/month. department may be empty to skip birthday generation.
func (a *App) GetCalendarEvents(department string, year int, month int) ([]CalendarEvent, error) {
	a.mu.RLock()
	client := a.apiClient
	a.mu.RUnlock()
	if client == nil {
		return nil, fmt.Errorf("API-Client nicht initialisiert")
	}

	startDate := fmt.Sprintf("%04d-%02d-01T00:00:00", year, month)
	firstOfNext := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
	endDate := firstOfNext.Format("2006-01-02") + "T00:00:00"

	cals, err := client.Calendars.ListAll(a.ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("Kalender konnten nicht geladen werden: %w", err)
	}

	var events []CalendarEvent

	for _, cal := range cals {
		evts, err := client.Events.ListAll(a.ctx, &easyvapi.EventListOptions{
			Calendar: cal.ID,
			StartGte: startDate,
			StartLte: endDate,
		})
		if err != nil {
			return nil, fmt.Errorf("Termine für Kalender '%s' konnten nicht geladen werden: %w", cal.Name, err)
		}
		color := cal.Color
		if color == "" {
			color = "#6366f1"
		}
		for _, e := range evts {
			events = append(events, CalendarEvent{
				ID:           e.ID,
				Name:         e.Name,
				Start:        e.Start,
				End:          e.End,
				AllDay:       e.AllDay,
				CalendarID:   cal.ID,
				CalendarName: cal.Name,
				Color:        color,
				Type:         "event",
			})
		}
	}

	if department != "" {
		cachedMembers, err := a.GetMembers(department)
		if err == nil {
			members := cachedMembers.Data
			monthStr := fmt.Sprintf("%02d", month)
			for _, m := range members {
				dob := m.DateOfBirth
				if len(dob) < 10 {
					continue
				}
				if dob[5:7] != monthStr {
					continue
				}
				birthYear, _ := strconv.Atoi(dob[:4])
				age := year - birthYear
				name := fmt.Sprintf("%s %s (%d)", m.FirstName, m.FamilyName, age)
				bdDate := fmt.Sprintf("%04d-%s-%s", year, dob[5:7], dob[8:10])
				events = append(events, CalendarEvent{
					ID:           -m.ID,
					Name:         name,
					Start:        bdDate,
					End:          bdDate,
					AllDay:       true,
					CalendarID:   -1,
					CalendarName: "Geburtstage",
					Color:        "#F5C400",
					Type:         "birthday",
				})
			}
		}
	}

	return events, nil
}
