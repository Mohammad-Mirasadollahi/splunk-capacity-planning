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

  const UI = {
    en: {
      home: "← Home",
      loading: "Loading…",
      fail: "Failed to load document:",
      footer_html:
        'Designed by <strong>Mohammad Mirasadollahi</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">GitHub</a>',
      lang_aria: "Language",
    },
    fa: {
      home: "→ خانه",
      loading: "در حال بارگذاری…",
      fail: "بارگذاری سند ناموفق بود:",
      footer_html:
        'طراحی: <strong>محمد میراسدالهی</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">GitHub</a>',
      lang_aria: "زبان",
    },
  };

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

  function persistLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
  }

  function setQuery(lang, doc) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    url.searchParams.set("doc", doc);
    window.history.replaceState({}, "", url);
  }

  /** Remove HTML chrome / embedded language nav so only one site language switcher remains. */
  function stripDocChrome(md) {
    let text = String(md || "");
    text = text.replace(/<nav\b[^>]*class=["']lang-switch["'][\s\S]*?<\/nav>\s*/gi, "");
    text = text.replace(/<link\b[^>]*>\s*/gi, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>\s*/gi, "");
    const heading = text.match(/^#\s.+$/m);
    if (heading) {
      text = text.slice(text.indexOf(heading[0]));
    }
    // Drop trailing wrapper closers left from the HTML shell
    text = text.replace(/\n<\/div>\s*$/i, "\n");
    return text.trim() + "\n";
  }

  function wrapWideTables(root) {
    root.querySelectorAll("table").forEach((table) => {
      if (table.parentElement?.classList.contains("doc-table-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "doc-table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function rewriteLinks(root, lang) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("http") || raw.startsWith("mailto:") || raw.startsWith("#")) return;

      const [pathPart, hashPart] = raw.split("#");
      const hash = hashPart ? `#${hashPart}` : "";
      const path = pathPart || "";

      const sibling = path.match(/^(?:\.\.\/)?(en|fa)\/([0-9]{2}-[\w.-]+\.md)$/);
      if (sibling) {
        a.setAttribute("href", `view.html?lang=${sibling[1]}&doc=${encodeURIComponent(sibling[2])}${hash}`);
        return;
      }

      const localDoc = path.match(/^([0-9]{2}-[\w.-]+\.md)$/);
      if (localDoc && ALLOWED.has(localDoc[1])) {
        a.setAttribute("href", `view.html?lang=${lang}&doc=${encodeURIComponent(localDoc[1])}${hash}`);
        return;
      }

      // Paths written relative to docs/en|fa/ → map to site root
      if (path.startsWith("../../")) {
        a.setAttribute("href", path.replace(/^\.\.\/\.\.\//, "") + hash);
        return;
      }
      if (path.startsWith("../") && !path.includes("/en/") && !path.includes("/fa/")) {
        a.setAttribute("href", path.replace(/^\.\.\//, "") + hash);
      }
    });

    // Never show a second language switcher inside the article
    root.querySelectorAll("nav.lang-switch").forEach((n) => n.remove());
  }

  function applyChrome(lang) {
    const ui = UI[lang] || UI.en;
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    document.body.dir = lang === "fa" ? "rtl" : "ltr";

    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
    const nav = document.querySelector(".lang-switch");
    if (nav) nav.setAttribute("aria-label", ui.lang_aria);

    const home = document.getElementById("home-link");
    if (home) {
      home.href = `index.html?lang=${lang}`;
      home.textContent = ui.home;
    }
    const label = document.getElementById("lang-label");
    if (label) label.textContent = ui.lang_aria;
    const foot = document.getElementById("view-footer");
    if (foot) foot.innerHTML = ui.footer_html;
  }

  async function load(lang, doc) {
    applyChrome(lang);
    const status = document.getElementById("status");
    const content = document.getElementById("content");
    const ui = UI[lang] || UI.en;
    status.hidden = true;
    content.innerHTML = `<p class="doc-loading">${ui.loading}</p>`;

    try {
      const res = await fetch(`docs/${lang}/${doc}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const md = stripDocChrome(await res.text());
      content.innerHTML = marked.parse(md);
      rewriteLinks(content, lang);
      wrapWideTables(content);
      document.title = `${doc.replace(/\.md$/, "")} · Splunk Capacity Planning`;
    } catch (err) {
      status.hidden = false;
      status.textContent = `${ui.fail} ${err.message}`;
      content.innerHTML = "";
    }
  }

  function switchLang(next) {
    const lang = next === "fa" ? "fa" : "en";
    const doc = readDoc();
    persistLang(lang);
    setQuery(lang, doc);
    load(lang, doc);
  }

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => switchLang(btn.dataset.lang));
  });

  const lang = readLang();
  const doc = readDoc();
  persistLang(lang);
  setQuery(lang, doc);
  load(lang, doc);
})();
