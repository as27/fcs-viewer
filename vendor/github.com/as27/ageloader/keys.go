package ageloader

import (
	"fmt"
	"os"
	"strings"

	"filippo.io/age"
)

// loadOrCreateKey loads an X25519 identity from path. If the file does not
// exist a new identity is generated and persisted with permissions 0600.
func loadOrCreateKey(path string) (*age.X25519Identity, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return generateAndSaveKey(path)
	}
	if err != nil {
		return nil, fmt.Errorf("ageloader: read key file: %w", err)
	}

	identity, err := age.ParseX25519Identity(strings.TrimSpace(string(data)))
	if err != nil {
		return nil, fmt.Errorf("ageloader: parse key: %w", err)
	}
	return identity, nil
}

// generateAndSaveKey creates a new X25519 identity, writes the secret key to
// path with permissions 0600, and returns the identity.
func generateAndSaveKey(path string) (*age.X25519Identity, error) {
	identity, err := age.GenerateX25519Identity()
	if err != nil {
		return nil, fmt.Errorf("ageloader: generate key: %w", err)
	}

	if err := os.WriteFile(path, []byte(identity.String()+"\n"), 0600); err != nil {
		return nil, fmt.Errorf("ageloader: write key file: %w", err)
	}
	return identity, nil
}
