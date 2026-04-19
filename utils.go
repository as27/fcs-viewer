package main

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// dateOnly returns the date portion (YYYY-MM-DD) of a datetime string.
func dateOnly(s string) string {
	if len(s) >= 10 {
		return s[:10]
	}
	return s
}
