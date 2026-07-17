(() => {
  const STORAGE_KEY = "scp-lang";
  const DEFAULT_LANG = "en";

  const DOCS = [
    {
      file: "00-References.md",
      en: { title: "Official References", hint: "Start here — citations & claim→source map" },
      fa: { title: "مراجع رسمی", hint: "از اینجا شروع کنید — ارجاعات و نگاشت ادعا→منبع" },
    },
    {
      file: "01-Infrastructure-Sizing.md",
      en: { title: "Infrastructure Sizing", hint: "SH / IDX counts, reference hardware, ES & ITSI" },
      fa: { title: "سایزینگ زیرساخت", hint: "تعداد SH/IDX، reference hardware، ES و ITSI" },
    },
    {
      file: "02-Storage-Sizing.md",
      en: { title: "Storage Sizing", hint: "TB capacity, RF/SF, SmartStore, DMA" },
      fa: { title: "سایزینگ Storage", hint: "ظرفیت TB، RF/SF، SmartStore، DMA" },
    },
    {
      file: "03-Disk-Media-IOPS-and-Storage-Topology.md",
      en: { title: "Disk Media, IOPS & Topology", hint: "SSD/NVMe, filesystems, NFS rules" },
      fa: { title: "رسانه دیسک، IOPS و توپولوژی", hint: "SSD/NVMe، فایل‌سیستم، قواعد NFS" },
    },
    {
      file: "04-IOPS-Sizing-by-Storage-Architecture.md",
      en: { title: "IOPS by Storage Architecture", hint: "Workbook by media / RAID / shared SSD" },
      fa: { title: "سایزینگ IOPS بر اساس معماری", hint: "ورک‌بوک رسانه / RAID / SSD اشتراکی" },
    },
    {
      file: "05-Index-Buckets-Retention-and-indexes-conf.md",
      en: { title: "Index Buckets & indexes.conf", hint: "Event size, hot/warm/cold/frozen, volumes, retention" },
      fa: { title: "Bucketها و indexes.conf", hint: "حجم Event، hot/warm/cold/frozen، volume، retention" },
    },
  ];

  const I18N = {
    en: {
      eyebrow: "Documentation pack",
      title: "Splunk Capacity Planning",
      lede: "Infrastructure, storage, disk media, and IOPS sizing from official Splunk docs — with citations.",
      start: "Start here",
      policy: "Doc policy",
      "policy-body":
        "Tracks Splunk Enterprise /latest/, Enterprise Security 8.5, and ITSI 5.0. English is the source of truth; Persian must stay structurally synced.",
      versions: "VERSION.md",
      readme: "README",
      footer: "Default language: English. Preference is saved in this browser.",
      credit_html:
        'Designed by <strong>Mohammad Mirasadollahi</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">GitHub</a>',
      footer_html:
        'Designed by <strong>Mohammad Mirasadollahi</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">github.com/Mohammad-Mirasadollahi/splunk-capacity-planning</a>',
    },
    fa: {
      eyebrow: "بسته مستندات",
      title: "برنامه‌ریزی ظرفیت Splunk",
      lede: "سایزینگ زیرساخت، storage، رسانه دیسک و IOPS از مستندات رسمی Splunk — همراه با ارجاع.",
      start: "از اینجا شروع کنید",
      policy: "سیاست مستند",
      "policy-body":
        "خط Enterprise با /latest/، Enterprise Security 8.5 و ITSI 5.0. انگلیسی منبع حقیقت است؛ فارسی باید از نظر ساختار همگام بماند.",
      versions: "VERSION.md",
      readme: "README",
      footer: "زبان پیش‌فرض: انگلیسی. ترجیح در این مرورگر ذخیره می‌شود.",
      credit_html:
        'طراحی: <strong>محمد میراسدالهی (Mohammad Mirasadollahi)</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">GitHub</a>',
      footer_html:
        'طراحی: <strong>محمد میراسدالهی (Mohammad Mirasadollahi)</strong> · <a href="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" target="_blank" rel="noopener noreferrer">github.com/Mohammad-Mirasadollahi/splunk-capacity-planning</a>',
    },
  };

  function readLang() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang");
    if (fromQuery === "en" || fromQuery === "fa") return fromQuery;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "fa") return stored;
    } catch (_) {}
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    const next = lang === "fa" ? "fa" : "en";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url);
    apply(next);
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    document.body.dir = lang === "fa" ? "rtl" : "ltr";

    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });

    const dict = I18N[lang];
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (dict[key]) el.innerHTML = dict[key];
    });

    const list = document.getElementById("doc-list");
    list.innerHTML = "";
    DOCS.forEach((doc) => {
      const meta = doc[lang];
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `view.html?lang=${lang}&doc=${encodeURIComponent(doc.file)}`;
      a.textContent = meta.title;
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = meta.hint;
      li.appendChild(a);
      li.appendChild(hint);
      list.appendChild(li);
    });
  }

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  apply(readLang());
})();
