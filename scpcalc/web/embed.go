package web

import "embed"

// FS holds the embedded SPA assets (offline Chart.js + tips + ES modules + WASM engine).
//
//go:embed index.html app.css app.js tips.js js/*.js css/*.css vendor/chart.umd.min.js wasm/*
var FS embed.FS
