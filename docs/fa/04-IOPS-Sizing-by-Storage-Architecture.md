<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<div dir="rtl" lang="fa" style="text-align:left; font-family: 'Vazirmatn', 'IRANSansX', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif; line-height:1.9; max-width:980px;">

<style>
  .fa-doc { direction: rtl; text-align: left; }
  .fa-doc, .fa-doc p, .fa-doc li, .fa-doc td, .fa-doc th, .fa-doc blockquote {
    font-family: 'Vazirmatn', 'IRANSansX', 'IRANSans', 'Tahoma', 'Segoe UI', sans-serif;
    text-align: left;
  }
  .fa-doc h1, .fa-doc h2, .fa-doc h3, .fa-doc h4 {
    font-family: 'Vazirmatn', 'IRANSansX', 'IRANSans', Tahoma, sans-serif;
    text-align: left;
  }
  .fa-doc code, .fa-doc pre, .fa-doc a {
    direction: ltr;
    unicode-bidi: isolate;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
    text-align: left;
  }
  .fa-doc table { width: 100%; }
  .fa-doc th, .fa-doc td { text-align: left; }
  .tag-official { background: #e8f5e9; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; }
  .tag-eng { background: #fff3e0; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; }
</style>

<div class="fa-doc">

<nav class="lang-switch" aria-label="زبان" style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; font-family:inherit; font-size:0.95rem;">
  <span style="opacity:0.75;">زبان:</span>
  <a href="../en/04-IOPS-Sizing-by-Storage-Architecture.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/04-IOPS-Sizing-by-Storage-Architecture.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# سایزینگ IOPS بر اساس معماری Storage

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)





> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md) — فهرست اصلی استنادهای رسمی

---

## سرفصل

- [0) دو لایه راهنما (اول این را بخوانید)](#0-دو-لایه-راهنما-اول-این-را-بخوانید)
- [1) اهداف رسمی IOPS / رسانه Splunk](#1-اهداف-رسمی-iops--رسانه-splunk)
- [2) موجودی‌برداری از ساختار پیاده‌سازی‌شده](#2-موجودیبرداری-از-ساختار-پیادهسازی‌شده)
- [3) هدف IOPS بر اساس نقش و توپولوژی](#3-هدف-iops-بر-اساس-نقش-و-توپولوژی)
- [4) کلاس رسانه: HDD در برابر SSD در برابر NVMe](#4-کلاس-رسانه-hdd-در-برابر-ssd-در-برابر-nvme)
- [5) بودن یا نبودن RAID — اثر روی IOPS قابل‌استفاده](#5-بودن-یا-نبودن-raid--اثر-روی-iops-قابلاستفاده)
- [6) Workbook تعداد دیسک](#6-workbook-تعداد-دیسک)
- [7) مثال‌های end-to-end بر اساس معماری](#7-مثالهای-end-to-end-بر-اساس-معماری)
- [8) ماتریس Pass / Fail](#8-ماتریس-pass--fail)
- [9) روش اندازه‌گیری (اجباری)](#9-روش-اندازهگیری-اجباری)
- [10) فهرست ارجاعات رسمی](#10-فهرست-ارجاعات-رسمی)

---

## 0) دو لایه راهنما (اول این را بخوانید)

| لایه | چیست | برچسب در این سند |
|---|---|---|
| **A — رسمی Splunk** | اعداد و قواعد رسانه از Capacity Planning / Installation / SmartStore / ES | <span class="tag-official">رسمی</span> |
| **B — پل مهندسی** | چگونه سطح RAID، تعداد دیسک و کلاس درایو با هم به اهداف رسمی می‌رسند (Splunk فرمول RAID منتشر نکرده) | <span class="tag-eng">مهندسی</span> |

**قاعده:** لایه B هیچ‌وقت لایه A را باطل نمی‌کند. اگر FIO نشان دهد کف رسمی را نمی‌زنید، معماری مردود است — فارغ از تعداد دیسک یا نوع RAID.

اسناد مکمل:

- `03-Disk-Media-IOPS-and-Storage-Topology.md` — رسانه مجاز / NFS / فایل‌سیستم  
- `02-Storage-Sizing.md` — **ظرفیت (TB)**، نه IOPS  
- **این سند** — **IOPS و ساختار دیسک** برای طراحی واقعی شما  

---

## 1) اهداف رسمی IOPS / رسانه Splunk

### 1.1 کف‌های سخت <span class="tag-official">رسمی</span>

| هدف | مقدار | اعمال می‌شود به |
|---|---|---|
| Sustained IOPS (حداقل) | **≥ 800** | Volume محل **نصب Splunk** |
| Sustained IOPS (حداقل) | **≥ 800** | Search Head اگر روی **HDD** باشد |
| فضای dedicated برای SH | **≥ 300 GB** | Storage سرچ‌هد |
| رسانه hot / warm / DMA ایندکسر | **SSD** | برای این نقش اختیاری نیست |
| رسانه محلی SmartStore | **NVMe یا SSD** | به‌همراه remote object store |
| Hot / warm روی شبکه | **ممنوع** | بدون NFS/DFS/CIFS برای hot/warm |
| Free space ایندکس | همیشه فضا آزاد؛ اگر **&lt; 5 GB** شود indexing **متوقف** می‌شود | همه volumeهای ایندکس |
| ترجیح block storage برای indexing | ترجیح **block-level** به file-level | Installation Manual (بحث NFS) |

**ارجاع:** [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)؛ [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 1.2 مدل Array اشتراکی سطح SSD <span class="tag-official">رسمی</span>

وقتی چند indexer از یک array مشترک با عملکرد **سطح SSD** استفاده می‌کنند:

```text
IOPS_array_for_indexers ≥ 4000 × N_indexers
```

مثال رسمی: **۱۰ indexer** → **۴۰٬۰۰۰ concurrent IOPS** فقط برای indexerها، به‌علاوه IOPS سایر workloadهای همان array.

برای ES روی VM: IOPS را با **همه نودهای indexer همزمان** اندازه بگیرید؛ ترجیح **thick** provisioning.

**ارجاع:** [Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)؛ [ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 1.3 SSD محلی per-host (غیر اشتراکی) <span class="tag-official">رسمی</span> + <span class="tag-eng">مهندسی</span>

Splunk برای hot/warm **SSD** را الزامی کرده، اما به‌جز قاعده **۸۰۰** برای volume نصب و مثال اشتراکی **۴۰۰۰×N**، کف عددی دومی با برچسب صریح «per local indexer SSD» منتشر نکرده است.

**هدف عملی این workbook:**

| الگوی میزبان | هدف IOPS برای طراحی/اندازه‌گیری |
|---|---|
| Hot/warm SSD محلی (دیسک اختصاصی روی indexer) | رسانه = SSD؛ install ≥ **۸۰۰**؛ با FIO ثابت کنید I/O تصادفی پایدار زیر بار همزمان index+search سالم است |
| اگر لنگر عددی هم‌راستا با مثال رسمی اشتراکی می‌خواهید | حدود **~۴۰۰۰ sustained IOPS per indexer** را به‌عنوان **لنگر برنامه‌ریزی سطح SSD** در نظر بگیرید |
| Search Head روی HDD | **≥ ۸۰۰ sustained** (صریح) |
| Search Head پرترافیک | ترجیح **SSD** (صریح) — سپس با FIO زیر بار scheduled+ad-hoc اعتبارسنجی |

---

## 2) موجودی‌برداری از ساختار پیاده‌سازی‌شده

قبل از هر محاسبه این فرم را پر کنید:

```text
A. نقش(های) این volume:     [ ] نصب OS/Splunk  [ ] SH  [ ] IDX hot+warm(+DMA)  [ ] cold  [ ] frozen  [ ] SmartStore cache
B. کلاس رسانه:               [ ] HDD  [ ] SATA/SAS SSD  [ ] NVMe SSD  [ ] ترکیبی
C. اتصال:                    [ ] Local DAS  [ ] Shared SAN  [ ] NAS/NFS (فقط cold/frozen)  [ ] دیسک کلود  [ ] NVMe instance store کلود
D. RAID:                     [ ] هیچ / JBOD / تک‌دیسک  [ ] RAID 0  [ ] RAID 1  [ ] RAID 10  [ ] RAID 5  [ ] RAID 6  [ ] سایر: ___
E. تعداد دیسک در مجموعه:     N_disks = ___
F. IOPS نامی هر دیسک:        I_disk = ___   (از دیتاشیت؛ بعداً با FIO جایگزین کنید)
G. تعداد indexer:            N_idx = ___
H. VM/workload دیگر روی همان array؟  [ ] بله  [ ] خیر
I. Thick یا thin (VM)؟       [ ] Thick  [ ] Thin  [ ] N/A
J. SmartStore؟               [ ] خیر  [ ] بله (روز cache: 30 / اگر ES: 90)
```

---

## 3) هدف IOPS بر اساس نقش و توپولوژی

### 3.1 درخت تصمیم <span class="tag-official">رسمی</span>

```text
START
 │
 ├─ Volume = نصب Splunk (هر نقش)
 │     → هدف ≥ 800 sustained IOPS
 │
 ├─ نقش = Search Head
 │     ├─ رسانه = HDD  → هدف ≥ 800 sustained؛ ظرفیت ≥ 300 GB
 │     └─ رسانه = SSD/NVMe → برای search سنگین ترجیح؛ install همچنان ≥ 800؛ با FIO اعتبارسنجی
 │
 ├─ نقش = Indexer hot + warm (+ DMA)
 │     ├─ رسانه MUST = SSD (یا مسیر SmartStore پایین)
 │     ├─ MUST NOT = network volume
 │     ├─ اگر Array اشتراکی سطح SSD بین indexerها:
 │     │     → IOPS آرایه ≥ 4000 × N_idx  (+ سایر workloadها)
 │     └─ اگر SSD/NVMe محلی اختصاصی per indexer:
 │           → رسانه = SSD/NVMe؛ sustained اندازه‌گیری‌شده باید index+search را تحمل کند
 │             (لنگر برنامه‌ریزی اغلب ~4000/indexer در مقایسه با مثال رسمی اشتراکی)
 │
 ├─ نقش = SmartStore cache
 │     → NVMe یا SSD محلی؛ ظرفیت از سند 02؛ شبکه به object store ترجیحاً 10 Gbps
 │
 ├─ نقش = Cold / Frozen
 │     → HDD/SAN/NAS/NFS/CIFS طبق سند 03
 │     → کف عددی رسمی IOPS برای cold منتشر نشده؛ latency جستجو تابع سرعت Storage است
 │     → cold ناپایدار می‌تواند indexing را تحت تأثیر بگذارد (هشدار رسمی)
 │
 └─ END → با FIO اثبات کنید (و اگر shared/ES است تست همزمان چند indexer)
```

### 3.2 جدول هدف سریع

| ساختار | رسانه رسمی | هدف رسمی IOPS / عملکرد |
|---|---|---|
| SH روی HDD | HDD مجاز | ≥ **۸۰۰** sustained |
| SH روی SSD/NVMe | اگر پرترافیک ترجیح | Install ≥ **۸۰۰**؛ اعتبارسنجی بار search |
| IDX hot/warm SSD محلی | **SSD الزامی** | R/W پرترافیک؛ بدون شبکه |
| IDX hot/warm NVMe محلی | در کلاس SSD / ترجیح SmartStore | همان کلاس SSD + اندازه‌گیری |
| N indexer روی shared SSD array | سطح SSD | **۴۰۰۰ × N** همزمان (+ سایر) |
| SmartStore محلی | NVMe یا SSD | working set کش؛ ۱۰ Gbps به remote |
| Cold روی NFS | فقط cold/frozen | قواعد hard mount؛ جستجوی کندتر |
| Hot/warm روی NFS | **نامعتبر** | پیاده نکنید |

---

## 4) کلاس رسانه: HDD در برابر SSD در برابر NVMe

### 4.1 Splunk کجا چه چیزی را مجاز کرده <span class="tag-official">رسمی</span>

| رسانه | Search Head | IDX Hot/Warm + DMA | SmartStore محلی | Cold | Frozen |
|---|---|---|---|---|---|
| **HDD** | بله اگر ≥ ۸۰۰ IOPS | **خیر** (SSD لازم است) | ترجیح نیست | بله | بله |
| **SSD** | بله (اگر پرترافیک ترجیح) | **بله (الزامی)** | بله | ممکن ولی معمولاً اسراف | ممکن |
| **NVMe** | بله (کلاس SSD) | بله (کلاس SSD / ترجیح SmartStore) | **در بسیاری کلودها ترجیح** | غیرمعمول | غیرمعمول |
| **SAN/NAS یا NFS** | جایگزین قواعد hot/warm نیست | Hot/warm روی شبکه **نه** | Remote = object store | بله (با caveat) | بله |

### 4.2 پیامد برنامه‌ریزی <span class="tag-eng">مهندسی</span>

از **دیتاشیت vendor + FIO** استفاده کنید، نه IOPS تبلیغاتی.

مرتبه بزرگی تقریبی I/O تصادفی بلوک کوچک (فقط برای شهود — با مقدار اندازه‌گیری‌شده خودتان عوض کنید):

| رسانه (تک‌دیسک، تقریبی) | مرتبه IOPS تصادفی |
|---|---|
| HDD سازمانی | صدها (معمولاً خیلی کمتر از SSD) |
| SATA/SAS SSD | هزار تا ده‌ها هزار |
| NVMe SSD | اغلب ده‌ها هزار به بالا |

**نتیجه مرتبط با Splunk:**

- ساختن hot/warm روی **HDD** حتی با RAID پر از spindle از نظر **رسانه** مردود است.  
- ساختن hot/warm روی **SSD/NVMe** در صورت رسیدن sustained IOPS اندازه‌گیری‌شده به هدف توپولوژی (§۳) می‌تواند قبول شود.  
- **NVMe** صریحاً برای SmartStore محلی (و مثال‌های AWS instance store) آمده؛ آن را لایه محلی پرترافیک بدانید.

---

## 5) بودن یا نبودن RAID — اثر روی IOPS قابل‌استفاده

### 5.1 موضع رسمی <span class="tag-official">رسمی</span>

Reference hardware فعلی سطح RAID مشخصی را اجباری نکرده. می‌توانید استفاده کنید از:

- بدون RAID (تک‌دیسک / JBOD / namespaceهای NVMe)  
- RAID سخت‌افزاری یا نرم‌افزاری  
- RAID پشت LUN در array فروشنده  

…به‌شرط آنکه **رسانه + sustained IOPS + قواعد جای‌گذاری** برقرار باشد.

### 5.2 ضرایب مهندسی RAID (برای تخمین IOPS قابل‌استفاده) <span class="tag-eng">مهندسی</span>

این ضرایب **مهندسی ذخیره‌سازی صنعتی** هستند و فقط برای تخمین رسیدن به اهداف رسمی Splunk‌اند. با vendor کنترلر RAID تأیید کنید (جریمه write فرق می‌کند).

تعاریف:

```text
I_disk   = IOPS تصادفی sustained یک دیسک (FIO یا دیتاشیت شما)
N_disks  = تعداد درایوهای مجموعه RAID/JBOD همین volume
W        = ضریب جریمه write (تقریبی)
```

| چیدمان | IOPS خواندن تقریبی | IOPS نوشتن تقریبی | نکته برای طرح Splunk |
|---|---|---|---|
| **بدون RAID / تک‌دیسک** | ≈ `I_disk` | ≈ `I_disk` | ساده؛ بدون افزونگی |
| **JBOD** | فقط per-disk | فقط per-disk | ظرفیت جمع می‌شود؛ IOPS خودکار aggregate نمی‌شود مگر stripe |
| **RAID 0** | ≈ `N_disks × I_disk` | ≈ `N_disks × I_disk` | حداکثر عملکرد؛ **بدون** تحمل خطا |
| **RAID 1** (آینه ۲ دیسک) | تا حدود `2 × I_disk` (خواندن) | ≈ `I_disk` (نوشتن) | افزونگی؛ write ≈ یک دیسک |
| **RAID 10** | ≈ `(N_disks/2) × I_disk` (خواندن اغلب بهتر) | ≈ `(N_disks/2) × I_disk` | الگوی رایج پرترافیک با افزونگی |
| **RAID 5** | ≈ `(N_disks - 1) × I_disk` (تقریبی خواندن) | ≈ `(N_disks × I_disk) / 4` (جریمه کلاسیک ~۴×) | indexing نوشتن‌محور اغلب آسیب می‌بیند |
| **RAID 6** | ≈ `(N_disks - 2) × I_disk` | ≈ `(N_disks × I_disk) / 6` (جریمه کلاسیک ~۶×) | جریمه write سنگین‌تر |

**Indexing روی hot/warm هم نوشتن و هم خواندن سنگین است.** چیدمان‌هایی با جریمه write بزرگ (RAID 5/6 کلاسیک) معمولاً به **دیسک بیشتر** یا **SSD/NVMe** نیاز دارند تا از سد عملکرد Splunk رد شوند.

### 5.3 فرمول چک حداقل <span class="tag-eng">مهندسی</span> → باید <span class="tag-official">رسمی</span> را ارضا کند

```text
I_usable_write ≈ f(RAID, N_disks, I_disk)
I_usable_read  ≈ g(RAID, N_disks, I_disk)

برای install یا HDD SH:
  min(I_usable_read, I_usable_write, measured_FIO) ≥ 800

برای shared SSD-level indexer array:
  measured_concurrent_IOPS_across_all_indexers ≥ 4000 × N_idx
  (+ حاشیه برای سایر workloadها)

برای hot/warm SSD/NVMe محلی:
  media ∈ {SSD, NVMe}
  AND sustained IOPS اندازه‌گیری‌شده زیر بار mixed R/W قابل قبول باشد
  (لنگر برنامه‌ریزی: در صورت مفید بودن با ~4000/indexer مقایسه کنید)
```

**همیشه تخمین را با FIO عوض کنید.** Splunk صریحاً از Reference hardware به تست FIO ارجاع می‌دهد.

---

## 6) Workbook تعداد دیسک

### 6.1 حل برای تعداد دیسک (مهندسی) <span class="tag-eng">مهندسی</span>

با هدف نوشتن‌محور `T` (IOPS) و مدل write مربوط به RAID:

```text
# RAID 0
N_disks ≥ ceil(T / I_disk)

# RAID 10 (تقریبی write ≈ (N/2)*I_disk)
N_disks ≥ ceil(2 × T / I_disk)   # و N زوج

# RAID 5 (تقریبی write ≈ N*I_disk/4)
N_disks ≥ ceil(4 × T / I_disk)

# RAID 6 (تقریبی write ≈ N*I_disk/6)
N_disks ≥ ceil(6 × T / I_disk)

# RAID 1 (۲ دیسک)
فقط اگر I_disk (write) ≥ T باشد OK است
```

سپس قیود **رسمی** را اعمال کنید:

1. اگر volume مربوط به hot/warm است → دیسک‌ها باید **SSD یا NVMe** باشند (تعداد HDD رسانه را «درست» نمی‌کند).  
2. اگر array اشتراکی است → بعد از ریاضی RAID باز هم **۴۰۰۰×N_idx** همزمان را اثبات کنید.  
3. اگر install/HDD SH است → `T ≥ 800`.  

### 6.2 ظرفیت در برابر IOPS (اشتباه نکنید)

| نیاز | سند | ورودی‌ها |
|---|---|---|
| چند **TB** | `02-Storage-Sizing.md` | ingest روزانه، retention، RF/SF، روزهای SmartStore |
| چند **IOPS / دیسک** | **این سند** | نقش، رسانه، RAID، N_disks، shared در برابر local |

یک RAID بزرگ HDD می‌تواند TB زیاد داشته باشد و همچنان برای hot/warm **مردود** باشد چون رسانه ≠ SSD.

---

## 7) مثال‌های end-to-end بر اساس معماری

### مثال A — SSD محلی، **بدون RAID**، ۱ دیسک hot/warm per indexer

```text
ساختار: DAS، ۱× SSD، بدون RAID، N_idx = 6
رسمی: رسانه OK (SSD)؛ شبکه نیست
مهندسی: I_usable ≈ I_disk
اقدام: FIO روی SSD؛ install ≥ 800؛ زیر بار سلامت indexer را ببینید
ریسک: بدون افزونگی دیسک (ریسک عملیاتی؛ الزام RAID از Splunk نیست)
```

### مثال B — **NVMe** محلی، دو دیسک **RAID 1**

```text
ساختار: ۲× NVMe، RAID 1، hot/warm
رسمی: کلاس NVMe/SSD برای لایه پرترافیک / SmartStore OK
مهندسی: write ≈ I_disk؛ read می‌تواند از هر دو بهره ببرد
اقدام: مسیر write را با FIO بسنجید؛ اثر rebuild را مانیتور کنید
```

### مثال C — **RAID 10** محلی روی ۸× SSD

```text
ساختار: ۸× SSD RAID 10، محلی روی indexer
مهندسی: write ≈ (8/2)*I_disk = 4*I_disk
اگر I_disk write تصادفی sustained ≈ 20k → write تقریبی ≈ 80k (فقط تخمین)
دروازه رسمی: همچنان SSD + اثبات FIO؛ install ≥ 800 روی volume جداگانه OS
```

### مثال D — SAN اشتراکی، LUNهای SSD، **RAID 5** پشت array، ۱۲ indexer

```text
هدف رسمی: 4000 × 12 = 48,000 concurrent IOPS فقط برای indexerها
مهندسی: جریمه write RAID 5 یعنی SSD بک‌اند بیشتری برای Sustaining لازم است
IOPS سرچ‌هد / اپ‌های دیگر روی همان array را هم اضافه کنید
ES: LUNهای thick؛ FIO از هر ۱۲ indexer همزمان
```

### مثال E — تعداد زیاد **HDD** در RAID 10 برای hot/warm

```text
رسمی: FAIL روی رسانه — hot/warm باید SSD باشد
حتی اگر ریاضی IOPS با ۲۴ HDD بزرگ به نظر برسد، ساختار غیرمطابق است
HDD را فقط برای cold/frozen بگذارید
```

### مثال F — SmartStore: کش محلی **NVMe** + S3، ۲۰ indexer

```text
رسمی: NVMe/SSD محلی؛ object store ریموت؛ ترجیح 10 Gbps
ظرفیت کش: سند 02 (۳۰ روز indexed، یا ۹۰ اگر ES)
IOPS: NVMe را طوری بگذارید که R/W کش + hydration باعث گرسنگی indexing/search نشود
اگر دیسک کش روی storage اشتراکی است، فرمول 4000×N همچنان مفید است
```

### مثال G — Cold روی **NFS**، NAS با ۴× HDD

```text
رسمی: فقط cold/frozen؛ hard mount؛ بدون WAN؛ بدون hot/warm
IOPS: کف عددی Splunk نیست؛ جستجوی کندتر انتظار می‌رود
یک مسیر NFS cold را به‌عنوان SPOF بین peerهای cluster اشتراک نگذارید
```

### مثال H — Search Head روی **HDD RAID 1** (۲ دیسک)

```text
رسمی: HDD مجاز اگر sustained IOPS ≥ 800؛ ≥ 300 GB
مهندسی: write ≈ I_disk → هر HDD (یا volume آینه) باید ≥ 800 sustained بدهد
اگر SH پرترافیک است: طبق Reference hardware ترجیحاً به SSD بروید
```

---

## 8) ماتریس Pass / Fail

| چک | شرط قبول |
|---|---|
| رسانه hot/warm | SSD یا NVMe (SmartStore محلی: NVMe یا SSD) |
| مسیر hot/warm | نه NFS/DFS/CIFS/network |
| FIO volume نصب | ≥ **۸۰۰** sustained IOPS |
| FIO SH روی HDD | ≥ **۸۰۰** sustained IOPS |
| Shared SSD array | همزمان ≥ **۴۰۰۰ × N_idx** (+ سایر) |
| انتخاب RAID | هر سطحی، **اگر** موارد بالا Pass شوند (سطح اجباری Splunk نیست) |
| تعداد دیسک | آن‌قدر که IOPS **اندازه‌گیری‌شده** Pass شود (تخمین فقط برای برنامه‌ریزی) |
| Thin در برابر thick (ES/VM) | ترجیح thick؛ IOPS رزرو شده |
| Free space | همیشه خیلی بیشتر از ۵ GB روی volume ایندکس |
| فایل‌سیستم | پشتیبانی‌شده (مثلاً ext4/XFS روی لینوکس) |

---

## 9) روش اندازه‌گیری (اجباری)

تخمین‌های §۵–§۶ برای **برنامه‌ریزی**اند. پذیرش نهایی با اندازه‌گیری است.

1. Volume نصب/OS را از volume ایندکس جدا کنید (رسمی).  
2. FIO (یا معادل vendor) را طبق ارجاع Reference hardware اجرا کنید.  
3. IOPS تصادفی **sustained**، latency و queue depth را زیر concurrency واقعی ثبت کنید.  
4. اگر array اشتراکی یا ES است: تست را از **همه indexerها همزمان** اجرا کنید.  
5. با اهداف §۳ مقایسه کنید؛ اگر Fail → دیسک اضافه / تغییر RAID / رفتن به SSD/NVMe / جدا کردن workload — سپس دوباره اندازه بگیرید.  
6. موجودی §۲ را کنار نتایج FIO برای ممیزی نگه دارید.

---

## 10) فهرست ارجاعات رسمی

| # | منبع | آنچه می‌توانید به‌عنوان رسمی Splunk استناد کنید |
|---|---|---|
| 1 | [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) | رسانه بر اساس نقش؛ ≥۸۰۰ IOPS؛ ۳۰۰ GB SH؛ ممنوعیت network برای hot/warm؛ توقف ۵ GB؛ مثال **۴۰۰۰×N**؛ اشاره به FIO |
| 2 | [System requirements](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements) | فایل‌سیستم؛ قواعد NFS/CIFS؛ ترجیح block-level؛ حساسیت disk I/O در VM |
| 3 | [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) | NVMe/SSD محلی؛ انواع دیسک کلود؛ ۱۰ Gbps |
| 4 | [ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security) | تست IOPS همزمان؛ thick در برابر thin |

جبر جریمه write / تعداد دیسک در §۵–§۶ **مهندسی** است، نه مشخصات RAID رسمی Splunk.

---

## یادآوری

- **رسمی:** کلاس رسانه + جای‌گذاری + ≥۸۰۰ + ۴۰۰۰×N (سطح SSD اشتراکی) + اندازه‌گیری با FIO.  
- **مهندسی:** بودن/نبودن RAID، سطح RAID و تعداد دیسک ابزار رسیدن به همان اهداف‌اند.  
- **HDD** را نمی‌توان با «انباشتن IOPS» برای hot/warm compliant کرد — آنجا SSD/NVMe لازم است.

</div>
</div>
