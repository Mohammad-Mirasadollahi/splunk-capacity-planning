package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/splunk-capacity-planning/scpcalc/internal/server"
)

func TestHealth(t *testing.T) {
	h, err := server.NewMux("test-ver")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" || body["version"] != "test-ver" {
		t.Fatalf("body=%v", body)
	}
}

func TestCalculateOK(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	payload := `{"daily_gb":100,"retention_days":60,"hot_warm_days":30,"headroom":1}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["daily_raw_gb"].(float64) != 100 {
		t.Fatalf("daily_raw_gb=%v", body["daily_raw_gb"])
	}
	conf, _ := body["indexes_conf"].(string)
	if !strings.Contains(conf, "[volume:hotwarm]") {
		t.Fatalf("indexes_conf missing volumes: %s", conf)
	}
}

func TestCalculateValidationError(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", rr.Code)
	}
}

func TestStaticIndex(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	body := rr.Body.String()
	if !strings.Contains(strings.ToLower(body), "scpcalc") || !strings.Contains(body, "atmosphere") {
		t.Fatalf("index.html unexpected: %s", body[:min(200, len(body))])
	}
}

func TestPresets(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	sources, ok := body["sources"].([]any)
	if !ok || len(sources) < 10 {
		t.Fatalf("sources=%v", body["sources"])
	}
}

func TestPlanOK(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	payload := `{"mode":"sources","retention_days":60,"hot_warm_days":30,"headroom":1,"summary_pct":0.1,"indexer_cluster":false,"sources":[{"key":"windows","label":"Windows","index_name":"windows","daily_gb":100,"event_bytes":1200,"enable_summary":true}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/plan", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["total_daily_raw_gb"].(float64) != 100 {
		t.Fatalf("total_daily_raw_gb=%v", body["total_daily_raw_gb"])
	}
	conf, _ := body["indexes_conf"].(string)
	if !strings.Contains(conf, "[windows]") || !strings.Contains(conf, "[windows_summary]") {
		t.Fatalf("indexes_conf missing summary: %s", conf)
	}
	design, _ := body["design"].(map[string]any)
	if design == nil || design["structure_text"] == nil || design["structure_text"] == "" {
		t.Fatalf("expected design.structure_text, got %v", design)
	}
}

func TestPlanTotalMode(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	payload := `{"mode":"total","total_daily_gb":200,"retention_days":30,"hot_warm_days":7,"headroom":1,"indexer_cluster":true,"rf":3,"sf":2,"has_es":true,"smartstore":true,"concurrent_users":12,"sources":[]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/plan", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	if body["total_daily_raw_gb"].(float64) != 200 {
		t.Fatalf("raw=%v", body["total_daily_raw_gb"])
	}
	design := body["design"].(map[string]any)
	if design["has_es"] != true {
		t.Fatalf("design=%v", design)
	}
}

func TestPlanCapacity(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	payload := `{"mode":"capacity","available_hot_gb":5000,"available_cold_gb":10000,"retention_days":90,"hot_warm_days":30,"headroom":1.2,"sources":[]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/plan", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	design, _ := body["design"].(map[string]any)
	if design == nil {
		t.Fatal("expected design")
	}
	if design["max_daily_gb_from_disk"] == nil || design["max_daily_gb_from_disk"].(float64) <= 0 {
		t.Fatalf("max_daily=%v", design["max_daily_gb_from_disk"])
	}
}

func TestPlanUnknownModeIgnored(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/plan", bytes.NewBufferString(`{"mode":"nope","sources":[{"index_name":"x","daily_gb":1}]}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPlanEmptyRejected(t *testing.T) {
	h, err := server.NewMux("dev")
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/plan", bytes.NewBufferString(`{"sources":[]}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", rr.Code)
	}
}
