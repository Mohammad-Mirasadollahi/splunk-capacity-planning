//go:build js && wasm

package main

import (
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/splunk-capacity-planning/scpcalc/internal/calc"
	"github.com/splunk-capacity-planning/scpcalc/internal/model"
	"github.com/splunk-capacity-planning/scpcalc/internal/presets"
)

// Version can be overridden via -ldflags.
var Version = "wasm"

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{"error":"json encode failed"}`
	}
	return string(b)
}

func errJSON(msg string) string {
	return mustJSON(map[string]string{"error": msg})
}

func wrap(fn func(js.Value, []js.Value) any) js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) (out any) {
		defer func() {
			if r := recover(); r != nil {
				out = errJSON(fmt.Sprintf("panic: %v", r))
			}
		}()
		return fn(this, args)
	})
}

func plan(_ js.Value, args []js.Value) any {
	if len(args) < 1 {
		return errJSON("missing plan JSON")
	}
	raw := args[0].String()
	var in model.PlanInput
	if err := json.Unmarshal([]byte(raw), &in); err != nil {
		return errJSON("invalid JSON: " + err.Error())
	}
	res, err := calc.CalculatePlan(in)
	if err != nil {
		return errJSON(err.Error())
	}
	return mustJSON(res)
}

func listPresets(_ js.Value, _ []js.Value) any {
	return mustJSON(map[string]any{
		"note":    "Default average event sizes are editable planning estimates — measure in your environment.",
		"sources": presets.Defaults(),
		"engine":  "wasm",
		"version": Version,
	})
}

func health(_ js.Value, _ []js.Value) any {
	return mustJSON(map[string]string{"status": "ok", "version": Version, "engine": "wasm"})
}

func main() {
	js.Global().Set("scpcalcReady", js.ValueOf(false))
	js.Global().Set("scpcalcPlan", wrap(plan))
	js.Global().Set("scpcalcPresets", wrap(listPresets))
	js.Global().Set("scpcalcHealth", wrap(health))
	js.Global().Set("scpcalcVersion", js.ValueOf(Version))
	js.Global().Set("scpcalcReady", js.ValueOf(true))
	select {}
}
