(() => {
  const STORAGE_KEY = "scp-lang";
  const DEFAULT_LANG = "en";
  const ALLOWED = new Set([
    "00-References.md",
    "01-Infrastructure-Sizing.md",
    "02-Storage-Sizing.md",
    "03-Disk-Media-IOPS-and-Storage-Topology.md",
    "04-IOPS-Sizing-by-Storage-Architecture.md",
    "05-Index-Buckets-Retention-and-indexes-conf.md",
  ]);

  function readLang() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("lang");
    if (q === "en" || q === "fa") return q;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "en" || s === "fa") return s;
    } catch (_) {}
    return DEFAULT_LANG;
  }

  function readDoc() {
    const params = new URLSearchParams(window.location.search);
    const doc = params.get("doc") || "00-References.md";
    return ALLOWED.has(doc) ? doc : "00-References.md";
  }

  function setQuery(lang, doc) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    url.searchParams.set("doc", doc);
    window.history.replaceState({}, "", url);
  }

  async function load(lang, doc) {
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    document.body.dir = lang === "fa" ? "rtl" : "ltr";
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
    document.getElementById("home-link").href = `index.html?lang=${lang}`;
    document.getElementById("home-link").textContent =
      lang === "fa" ? "→ خانه" : "← Home";

    const status = document.getElementById("status");
    const content = document.getElementById("content");
    status.hidden = true;
    content.innerHTML = lang === "fa" ? "<p>در حال بارگذاری…</p>" : "<p>Loading…</p>";

    try {
      const res = await fetch(`docs/${lang}/${doc}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const md = await res.text();
      content.innerHTML = marked.parse(md);
      document.title = `${doc.replace(/\.md$/, "")} · Splunk Capacity Planning`;
    } catch (err) {
      status.hidden = false;
      status.textContent =
        lang === "fa"
          ? `بارگذاری سند ناموفق بود: ${err.message}`
          : `Failed to load document: ${err.message}`;
      content.innerHTML = "";
    }
  }

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang === "fa" ? "fa" : "en";
      const doc = readDoc();
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (_) {}
      setQuery(lang, doc);
      load(lang, doc);
    });
  });

  const lang = readLang();
  const doc = readDoc();
  setQuery(lang, doc);
  load(lang, doc);
})();
