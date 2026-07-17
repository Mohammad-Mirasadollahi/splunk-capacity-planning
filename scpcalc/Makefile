APP := scpcalc
VERSION_FILE := VERSION
VERSION ?= $(shell tr -d '[:space:]' < $(VERSION_FILE) 2>/dev/null || echo dev)
BIN_DIR := bin
DIST_DIR := dist
RELEASES_DIR := releases
LDFLAGS := -X main.version=$(VERSION)
GO ?= go

.PHONY: test build dist clean live-test wasm html pages-calc release docker

test:
	$(GO) test ./...

live-test: build
	python3 scripts/live_test.py

# Assemble modular web/html/*.html → web/index.html (embedded + Pages).
html:
	python3 scripts/assemble_html.py

# Always rebuild WASM before embedding into the binary (wasm is gitignored).
build: html wasm
	mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 $(GO) build -ldflags "$(LDFLAGS)" -o $(BIN_DIR)/$(APP) .

wasm:
	GO=$(GO) VERSION=$(VERSION) bash scripts/build_wasm.sh

pages-calc: html wasm
	bash scripts/sync_pages_calc.sh

# Local versioned artifacts → releases/scpcalc-v$(VERSION)/ (gitignored; publish via tag)
release:
	chmod +x scripts/make_release.sh
	GO=$(GO) bash scripts/make_release.sh $(VERSION)

# Local container image (CI publishes to ghcr.io/mohammad-mirasadollahi/scpcalc).
docker: html
	docker build -t scpcalc:$(VERSION) -t scpcalc:latest --build-arg VERSION=$(VERSION) .

dist: release
	mkdir -p $(DIST_DIR)
	cp -a $(RELEASES_DIR)/scpcalc-v$(VERSION)/. $(DIST_DIR)/

clean:
	rm -rf $(BIN_DIR) $(DIST_DIR) $(RELEASES_DIR)
	rm -f web/wasm/scpcalc.wasm web/wasm/wasm_exec.js
