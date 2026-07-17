/** Shared mutable UI state */
export const state = {
  rows: [],
  step: 0,
  volumeInputMode: "daily_gb", // "daily_gb" | "eps" — both are raw/pre-indexed ingest
  lastConf: "",
  lastConfGenerated: "",
  lastDesignTxt: "",
  lastPlan: null,
  reviewPreview: null,
  confFindPos: 0,
  volState: {
    hotName: "hotwarm",
    coldName: "cold",
    sumName: "summaries",
    hotPath: "/hot",
    coldPath: "/cold",
    sumPath: "/summaries",
    frozenPath: "/frozen",
  },
};

export const LANG_KEY = "scpcalc-lang";
export const SAVE_KEY = "scpcalc-plan";
export const STEPS = 4;

export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
