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
</style>

<div class="fa-doc">

<nav class="lang-switch" aria-label="زبان" style="margin:0 0 1.25rem; display:flex; gap:0.5rem; align-items:center; font-family:inherit; font-size:0.95rem;">
  <span style="opacity:0.75;">زبان:</span>
  <a href="../en/02-Storage-Sizing.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/02-Storage-Sizing.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# طرح سایزینگ Storage در Splunk

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)







> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md) — فهرست اصلی استنادهای رسمی  
> **بعد:** بعد از دانستن مجموع TB، تنظیم per-index و retention را در [`05-Index-Buckets-Retention-and-indexes-conf.md`](05-Index-Buckets-Retention-and-indexes-conf.md) انجام دهید.

---

## سرفصل

- [0) خلاصه منطق Storage اسپلانک در یک نگاه](#0-خلاصه-منطق-storage-اسپلانک-در-یک-نگاه)
- [1) پایه‌ی رسمی فشرده‌سازی (Compression Model)](#1-پایهی-رسمی-فشردهسازی-compression-model)
  - [1.1 نسبت‌های رسمی فایل‌ها](#11-نسبتهای-رسمی-فایلها)
  - [1.2 فرمول پایه رسمی (غیر Cluster)](#12-فرمول-پایه-رسمی-غیر-cluster)
  - [1.3 ورودی‌های لازم برای Planning Index Storage](#13-ورودیهای-لازم-برای-planning-index-storage)
- [2) اندازه‌گیری Compression واقعی از Sample (روش رسمی)](#2-اندازهگیری-compression-واقعی-از-sample-روش-رسمی)
  - [2.1 روی *nix](#21-روی-nix)
  - [2.2 روی Windows](#22-روی-windows)
- [3) انواع Storage به ازای نقش و Bucket Tier](#3-انواع-storage-به-ازای-نقش-و-bucket-tier)
  - [3.1 جدول رسمی نوع دیسک](#31-جدول-رسمی-نوع-دیسک)
  - [3.2 Aging داده‌ها (Hot → Warm → Cold → Frozen)](#32-aging-دادهها-hot-warm-cold-frozen)
- [4) Storage در Indexer Cluster (Replication Factor و Search Factor)](#4-storage-در-indexer-cluster-replication-factor-و-search-factor)
  - [4.1 چه فایل‌هایی replicate می‌شوند؟](#41-چه-فایلهایی-replicate-میشوند؟)
  - [4.2 فرمول Storage خوشه‌ای (استخراج از نسبت‌های رسمی + رفتار RF/SF)](#42-فرمول-storage-خوشهای-استخراج-از-نسبتهای-رسمی-رفتار-rfsf)
  - [4.3 نکته Hot Buckets در Cluster](#43-نکته-hot-buckets-در-cluster)
  - [4.4 Multisite](#44-multisite)
- [5) SmartStore Storage Sizing](#5-smartstore-storage-sizing)
  - [5.1 مدل Hybrid](#51-مدل-hybrid)
  - [5.2 اندازه Local Cache (فرمول رسمی توصیه‌ای)](#52-اندازه-local-cache-فرمول-رسمی-توصیهای)
  - [5.3 استثنای Enterprise Security برای Cache](#53-استثنای-enterprise-security-برای-cache)
  - [5.4 Remote Object Store](#54-remote-object-store)
  - [5.5 ملاحظات Infra مرتبط با Storage SmartStore](#55-ملاحظات-infra-مرتبط-با-storage-smartstore)
- [6) Storage مربوط به Premium Apps](#6-storage-مربوط-به-premium-apps)
  - [6.1 Enterprise Security — Data Model Acceleration (DMA)](#61-enterprise-security-data-model-acceleration-dma)
  - [6.2 ITSI — Summary / KV Store / Internal indexes](#62-itsi-summary-kv-store-internal-indexes)
- [7) Search Head Storage](#7-search-head-storage)
- [8) Workbook محاسبه Storage (فرمول‌های اجرایی)](#8-workbook-محاسبه-storage-فرمولهای-اجرایی)
  - [8.1 Non-clustered Indexers](#81-non-clustered-indexers)
  - [8.2 Clustered Indexers (مدل rawdata/TSIDX)](#82-clustered-indexers-مدل-rawdatatsidx)
  - [8.3 تفکیک Hot/Warm vs Cold (اختیاری ولی توصیه‌شده)](#83-تفکیک-hotwarm-vs-cold-اختیاری-ولی-توصیهشده)
  - [8.4 SmartStore](#84-smartstore)
  - [8.5 جمع نهایی per Indexer (چک‌لیست ظرفیت)](#85-جمع-نهایی-per-indexer-چکلیست-ظرفیت)
- [9) مثال‌های end-to-end](#9-مثالهای-end-to-end)
  - [مثال A — Core Splunk، بدون Cluster](#مثال-a-core-splunk،-بدون-cluster)
  - [مثال B — Cluster RF=3 SF=2 ، بدون SmartStore](#مثال-b-cluster-rf3-sf2-،-بدون-smartstore)
  - [مثال C — SmartStore + ES](#مثال-c-smartstore-es)
  - [مثال D — هم‌راستا با جدول ES Small](#مثال-d-همراستا-با-جدول-es-small)
- [10) Virtualized / Shared Storage IOPS (مرتبط با ظرفیت عملیاتی)](#10-virtualized-shared-storage-iops-مرتبط-با-ظرفیت-عملیاتی)
- [11) الگوریتم تصمیم Storage (Flow)](#11-الگوریتم-تصمیم-storage-flow)
- [12) فهرست ارجاعات رسمی این سند](#12-فهرست-ارجاعات-رسمی-این-سند)
- [13) Reminder](#13-reminder)

---
## 0) خلاصه منطق Storage اسپلانک در یک نگاه

```text
داده‌ی خام ورودی (License / Ingest volume)
        │
        ▼
   Indexing Process
   ┌────────────────────────────┐
   │ rawdata  ≈ 15% حجم اولیه   │  ← فشرده شده‌ی eventها
   │ TSIDX    ≈ 35% حجم اولیه   │  ← index terms
   │ مجموع    ≈ 50% حجم اولیه   │  ← قاعده تخمین رسمی
   └────────────────────────────┘
        │
        ▼
   Bucket lifecycle: Hot → Warm → Cold → Frozen
        │
        ├── بدون Cluster: فضا ≈ D × Days × 0.5
        ├── با Cluster:   فضا ≈ D × Days × (0.15×RF + 0.35×SF)
        └── SmartStore:   Local cache (روزهای working set) + Remote object store (retention کامل)
```

---

## 1) پایه‌ی رسمی فشرده‌سازی (Compression Model)

### 1.1 نسبت‌های رسمی فایل‌ها

هنگام ingest، indexing روی دیسک چند نوع فایل می‌سازد:

| فایل | محتوا | نسبت تقریبی به داده pre-indexed |
|---|---|---|
| **rawdata** | source data به‌صورت event فشرده | **≈ 15%** |
| **TSIDX (index files)** | terms که به rawdata اشاره می‌کنند | **≈ 35%** |
| **مجموع** | rawdata + TSIDX | **≈ 50%** |

مستند رسمی می‌گوید ساختار داده و فیلدها روی compression اثر می‌گذارند و مشتریان معمولاً منابع متنوعی با compressionهای متفاوت دارند، ولی **aggregate compression برای تخمین Storage همچنان 50%** است.

**ارجاع:**  
[Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements) — Capacity Planning Manual  
جملات کلیدی بخش اول همان صفحه (rawdata 15% / TSIDX 35% / combined ~50%).

### 1.2 فرمول پایه رسمی (غیر Cluster)

راهنمای تخصیص دیسک:

```text
Storage_GB ≈ Daily_License_GB × Retention_Days × 0.5
```

یا معادل:

```text
Storage_GB ≈ (Daily_License_GB × Retention_Days) / 2
```

**مثال رسمی مستند:**  
نگه‌داشتن 30 روز داده با ingest = 100 GB/day:

```text
Storage = 100 × 30 / 2 = 1,500 GB = 1.5 TB
```

اگر 2 indexer دارید، فضا را مساوی تقسیم کنید:

```text
Per_Indexer = 1,500 / 2 = 750 GB
```

> این مثال فضای OS، thresholdهای دیگر نرم‌افزار، و ملاحظات خارج از Splunk را شامل نمی‌شود.

**ارجاع:**  
همان صفحه *Estimate your storage requirements* — پاراگراف مثال 100GB/day × 30 days.

### 1.3 ورودی‌های لازم برای Planning Index Storage

طبق همان مستند، برنامه‌ریزی ظرفیت index بر اساس:
1. Data volume per day (همان پایه License)
2. مدت نگه‌داشت (retention)
3. تعداد indexerها
4. (اختیاری) ارزش داده / سرعت نیاز به search / الزام audit/archive
5. (اختیاری) اندازه‌گیری compression واقعی با sample
6. (اختیاری) Index cluster → محاسبات اضافه
7. (اختیاری) SmartStore
8. (اختیاری) Enterprise Security → DMA storage & retention

**ارجاع:**  
[Estimate your storage requirements → Planning the index storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

---

## 2) اندازه‌گیری Compression واقعی از Sample (روش رسمی)

اگر می‌خواهید به‌جای 50% پیش‌فرض، نسبت واقعی محیط خود را بگذارید:

### 2.1 روی *nix

1. یک sample از data source بگیرید و اندازه on-disk آن را یادداشت کنید.
2. Sample را index کنید (file monitor یا one-shot).
3. بروید به `$SPLUNK_HOME/var/lib/splunk/defaultdb/db`
4. اجرا: `du -ch hot_v*` و خط `total` را ببینید.
5. اندازه sample را با اندازه indexed مقایسه کنید.

### 2.2 روی Windows

مستند مراحل `du.exe` از Microsoft TechNet و حلقه‌های `for /d` روی `hot_v*` را برای جمع rawdata و سپس `dir /s` برای کل index شرح می‌دهد.

**خروجی:** نسبت `Indexed_Size / Sample_Size` = compression factor واقعی شما (`C`). سپس:

```text
Storage_GB ≈ Daily_GB × Retention_Days × C
```

**ارجاع:**  
[Estimate your storage requirements → Use a data sample to calculate compression](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

---

## 3) انواع Storage به ازای نقش و Bucket Tier

### 3.1 جدول رسمی نوع دیسک

| Role / Tier | نوع توصیه‌شده | نکات |
|---|---|---|
| Search Head | SSD یا HDD (≥800 IOPS) | حداقل 300 GB dedicated؛ SH پرترافیک → SSD |
| Indexer Hot + Warm + DMA | **SSD** | مسیر پیش‌فرض یکسان برای hot/warm و data model acceleration |
| SmartStore local | **NVMe یا SSD** + remote object store | cache کوتاه‌مدت + بازیابی bucket از cloud |
| Cold | HDD / SAN / NAS / NFS | ارزان‌تر/کندتر؛ جستجو کندتر |
| Frozen | SAN / NAS / NFS / HDD | آرشیو؛ پیش‌فرض حذف |

**قواعد حیاتی:**
- Volume نصب Splunk ≥ **800 sustained IOPS**
- Index جدا از OS/swap
- Free space همیشه لازم است؛ اگر volume ایندکس‌ها < **5 GB** آزاد شود، indexing متوقف می‌شود
- **هرگز** hot/warm روی network volume نباشد (latency indexing را خراب می‌کند)
- NFS/DFS برای cold قابل استفاده است ولی search کندتر می‌شود

**ارجاع:**  
[Reference hardware → What storage type should I use for a role? / Notes about optimizing…](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.2 Aging داده‌ها (Hot → Warm → Cold → Frozen)

از معماری bucket:

| Stage | معنی عملی برای Storage |
|---|---|
| **Hot** | در حال نوشتن؛ روی سریع‌ترین دیسک (SSD) |
| **Warm** | فقط خواندنی برای search؛ معمولاً همان volume با hot |
| **Cold** | بعد از حد فضا/زمان از warm؛ می‌تواند volume جدا و ارزان‌تر باشد |
| **Frozen** | آرشیو یا حذف؛ searchable نیست مگر restore |

**ارجاع مفهومی bucket stages:**  
[Buckets and indexer clusters → Bucket stages](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)  
و ارجاع متقابل همان صفحه به *How the indexer stores indexes* / *Storage considerations* / *Configure index storage*.

برای جزئیات policyهای `maxHotSpanSecs`، `maxDataSize`، `frozenTimePeriodInSecs`، `homePath`/`coldPath`/`thawedPath` به:
*Managing Indexers and Clusters → How the indexer stores indexes / Configure index storage* مراجعه کنید (لینک‌های ارجاعی داخل صفحات بالا).

---

## 4) Storage در Indexer Cluster (Replication Factor و Search Factor)

### 4.1 چه فایل‌هایی replicate می‌شوند؟

طبق مستند **Buckets and indexer clusters**:

- هر bucket شامل حداقل:
  - **rawdata** (compressed processed events + اطلاعات لازم برای بازسازی index)
  - **index/TSIDX files** (فقط روی نسخه‌های searchable)
- **همه** کپی‌ها (searchable و non-searchable) دارای rawdata هستند.
- فقط کپی‌های searchable دارای TSIDX هستند.
- اگر `searchFactor = 1`: target peerها فقط rawdata نگه می‌دارند (صرفه‌جویی فضا).
- اگر `searchFactor > 1`: تعدادی از peerها TSIDX هم می‌سازند.

مثال رسمی مفهومی: `RF=3`, `SF=2` → سه کپی rawdata؛ دو کپی searchable (با TSIDX).

**ارجاع:**  
[Buckets and indexer clusters → Data files / Bucket searchability](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)

### 4.2 فرمول Storage خوشه‌ای (استخراج از نسبت‌های رسمی + رفتار RF/SF)

از ترکیب:
- نسبت‌های 15% / 35% در *Estimate your storage requirements*
- توزیع فایل‌ها بر اساس RF/SF در *Buckets and indexer clusters*

برای کل cluster (مجموع دیسک همه peerها، قبل از تقسیم per-node):

```text
Cluster_Storage_GB =
    Daily_Ingest_GB
  × Retention_Days
  × ( 0.15 × ReplicationFactor  +  0.35 × SearchFactor )
```

**تفسیر:**
- برای هر روز ingest، بخش rawdata به‌اندازه `0.15 × RF` نگه داشته می‌شود
- بخش TSIDX به‌اندازه `0.35 × SF` نگه داشته می‌شود

#### حالت خاص غیر Cluster
`RF=1`, `SF=1`:

```text
0.15×1 + 0.35×1 = 0.50
```
که دقیقاً همان قاعده 50% رسمی است.

#### مثال عددی Cluster
فرض: `D=500 GB/day`, `Days=90`, `RF=3`, `SF=2`

```text
Multiplier = 0.15×3 + 0.35×2 = 0.45 + 0.70 = 1.15
Cluster_Storage = 500 × 90 × 1.15 = 51,750 GB ≈ 50.5 TB
```

اگر 5 peer متوازن دارید:

```text
Per_Peer ≈ 51,750 / 5 ≈ 10,350 GB ≈ 10.1 TB
```

> **یادداشت ارجاع:** مستند *Estimate your storage requirements* صراحتاً می‌گوید برای index cluster باید به *Storage requirement examples* در Managing Indexers and Clusters مراجعه کنید. فرمول بالا همان مدل استاندارد Splunk است که از درصدهای رسمی rawdata/TSIDX و سیاست RF/SF همان manual به‌دست می‌آید. هنگام پیاده‌سازی، صفحه *Storage requirement examples* نسخه Enterprise خود را هم برای تأیید عددی باز کنید.

**ارجاعهای سازنده فرمول:**  
1. [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements) — درصدها و اشاره به cluster examples  
2. [Buckets and indexer clusters](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters) — rawdata روی همه کپی‌ها، TSIDX روی searchableها

### 4.3 نکته Hot Buckets در Cluster

در SmartStore system requirements (برای cluster عموماً هم صادق است که hot از RF/SF پیروی می‌کند): hot buckets سیاست replication/search factor را دنبال می‌کنند و **per-bucket** فضای بیشتری نسبت به warm هم‌اندازه دارند.

**ارجاع:**  
[SmartStore system requirements → Local storage requirements (indexer clusters bullets)](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

### 4.4 Multisite

در multisite، تعداد primary setها و سیاست site replication می‌تواند کپی‌های بیشتری نسبت به single-site ایجاد کند. مستند buckets توضیح می‌دهد که در multisite، هر site برای search affinity مجموعه primary خودش را دارد.

برای سایزینگ دقیق multisite، RF/SF را به‌صورت **site-aware** از `indexes.conf` / cluster manager بخوانید و همان Multiplier را با تعداد کپی‌های واقعی rawdata و searchable اعمال کنید.

**ارجاع:**  
[Buckets and indexer clusters → primacy / multisite note](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters)

---

## 5) SmartStore Storage Sizing

### 5.1 مدل Hybrid

SmartStore:
- نوشتن/خواندن کوتاه‌مدت و cache بازیابی از object store → روی **local NVMe/SSD**
- نگه‌داشت بلندمدت bucketها → روی **remote object store** (S3 / GCS / Azure Blob / S3-compatible)

**ارجاع:**  
[Reference hardware → Indexer: SmartStore](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

### 5.2 اندازه Local Cache (فرمول رسمی توصیه‌ای)

مستند می‌گوید حجم local storage برای cached data باید متناسب با **expected working set** باشد.

**توصیه بهترین نتیجه:**

```text
Local_Cache_GB ≈ Daily_Indexed_GB × 30
```

چون اندازه indexed معمولاً حدود **50%** ingest است:

```text
Daily_Indexed_GB ≈ 0.5 × Daily_Ingest_GB
Local_Cache_GB  ≈ 0.5 × Daily_Ingest_GB × 30
               ≈ Daily_Ingest_GB × 15
```

**مثال رسمی:** اگر indexer حدود 100 GB/day **indexed** اضافه کند → cache توصیه‌ای **3000 GB**.

**حداقل:** حداقل معادل **7–10 روز** داده در cache (چون جستجوها معمولاً روی 7–10 روز اخیرند).

### 5.3 استثنای Enterprise Security برای Cache

برای استفاده با **Splunk Enterprise Security**، به‌جای 30 روز، به‌اندازه **90 روز** indexed data برای local cache در نظر بگیرید:

```text
Local_Cache_ES_GB ≈ Daily_Indexed_GB × 90
                 ≈ 0.5 × Daily_Ingest_GB × 90
                 ≈ Daily_Ingest_GB × 45
```

**ارجاع مستقیم:**  
[SmartStore system requirements → Local storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)  
جمله: *For use with Splunk Enterprise Security, provision enough local storage to accommodate 90 days' worth of indexed data, rather than the otherwise recommended 30 days.*  
و اشاره به اینکه اندازه indexed حدود 50% ingest است + ارجاع به Estimating storage requirements.

### 5.4 Remote Object Store

```text
Remote_Store_GB ≈ Daily_Ingest_GB × Retention_Days × Cluster_Multiplier
```

برای SmartStore، بخش عمده retention روی remote است؛ local فقط cache/working set است.  
`Cluster_Multiplier` را با همان منطق RF/SF (و رفتار SmartStore برای warm در remote) طبق طراحی cluster خود اعمال کنید؛ جزئیات پیکربندی path در `indexes.conf` باید per cluster یکتا باشد (اشتراک path بین چند cluster ممنوع).

**ارجاع:**  
همان صفحه — CAUTION درباره unique بودن `path`؛ و بخش Remote store requirements.

### 5.5 ملاحظات Infra مرتبط با Storage SmartStore

| مورد | مقدار/قاعده رسمی |
|---|---|
| شبکه به remote store | برای optimal performance: **10 Gbps** از هر indexer |
| پورت | https استاندارد به object store |
| Local disk type on-prem | SSD ترجیحی |
| AWS | NVMe SSD Instance Storage (مثلاً i3en/i3) |
| GCP | n1-highmem-64/32 + zonal SSD PD |
| Azure | E-series (Edv4/Edsv4) + SSD |
| Partition cache | cache با partition یکی است؛ OS، باینری Splunk، artifacts و indexهای non-SmartStore هم روی همان partition جا می‌گیرند → در sizing لحاظ کنید |

**ارجاع:**  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 6) Storage مربوط به Premium Apps

### 6.1 Enterprise Security — Data Model Acceleration (DMA)

#### جایگاه ذخیره‌سازی
طبق Reference hardware، storage مربوط به **data model acceleration** به‌طور پیش‌فرض روی همان volume مسیر hot/warm indexer است → باید **SSD** باشد و در ظرفیت hot/warm حساب شود.

**ارجاع:**  
[Reference hardware → Indexer: Hot and warm index storage, data model storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

#### اشاره Capacity Planning به محاسبه DMA
مستند Estimate storage صریحاً می‌گوید اگر ES دارید:

> See **Data model acceleration storage and retention** in the Install and Upgrade Splunk Enterprise Security manual.

**ارجاع:**  
[Estimate your storage requirements → Planning the index storage (optional ES bullet)](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

#### Constraints رسمی ES درباره DMA
از Performance reference ES:
- DMA از indexer برای processing و storage استفاده می‌کند و داده شتاب‌گرفته در هر index ذخیره می‌شود.
- بار DMA به تعداد data modelهای accelerated، نوع داده، cardinality و حجم بستگی دارد.
- برای بهبود عملکرد، DMA را به indexهای خاص محدود کنید.
- برای محاسبه فضای اضافه: به موضوع **Data model acceleration storage and retention** مراجعه کنید.
- تنظیم retention روی TSIDX، retentionِ DMA را عوض نمی‌کند.

**ارجاع:**  
[Performance reference for Splunk Enterprise Security → Constraints on data model acceleration / retention](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

#### روش عملی محاسبه (با ارجاع اجباری به صفحه DMA)

```text
1) لیست data modelهای accelerated در ES/CIM را دربیاورید
2) برای هر DM: Daily_Volume_in_DM و Summary_Retention_Days را از
   datamodels.conf / ES DMA storage & retention doc بخوانید
3) Storage_DMA را طبق فرمول همان صفحه ES محاسبه و جمع کنید
4) Storage_DMA را به ظرفیت SSD hot/warm هر indexer اضافه کنید
```

> به‌خاطر تفاوت نسخه‌های ES، ضریب عددی دقیق DMA را از صفحه **Data model acceleration storage and retention** نسخه ES خودتان بردارید و اینجا به‌صورت ثابت «حدس» نزنید. نقطه ورود رسمی از Capacity Manual و ES Performance reference همین ارجاع است.

### 6.2 ITSI — Summary / KV Store / Internal indexes

| مورد | الزام Storage | ارجاع |
|---|---|---|
| Free space در `$SPLUNK_HOME` | حداقل **30 GB** (KV store و داده‌های محلی SH) | [Plan your ITSI deployment → KV store size limits](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) |
| `itsi_summary` و KPI data | بهتر است از SH به indexer forward شود؛ فضا روی indexer tier | همان مستند → Forward search head data |
| KV store batch limits | `max_size_per_batch_save_mb` (پیش‌فرض 50MB)؛ در صورت نیاز 1.5× | همان بخش KV store |
| `max_size_per_result_mb` | پیش‌فرض 500MB؛ راهنما: حدود 500MB per 1,000 KPIs | همان بخش |
| Event Analytics internal license stack | حجم داخلی notable/episode روی stack جدا؛ روی license روزانه شما حساب نشود | بخش License requirements |

برای ظرفیت دیسک summary ایندکس‌های ITSI، retention هر index ITSI را از *Configure indexes in ITSI* بخوانید و با فرمول پایه 50% (یا RF/SF) جمع کنید.

---

## 7) Search Head Storage

حداقل‌های رسمی:
- ≥ **300 GB** dedicated storage
- اگر ad-hoc/scheduled سنگین → **SSD**
- اگر HDD → ≥ **800 sustained IOPS**
- Volume نصب Splunk جداگانه ≥ 800 IOPS

در ITSI dedicated SH، علاوه بر این، ≥ 30 GB free در `$SPLUNK_HOME` برای KV store.

**ارجاع:**  
[Reference hardware → Search Head storage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[Plan your ITSI deployment → KV store size limits](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

---

## 8) Workbook محاسبه Storage (فرمول‌های اجرایی)

تعاریف:

```text
D      = Daily ingest (GB/day)   # license volume
R      = Retention in hot+warm+cold searchable days
C      = Compression factor     # پیش‌فرض 0.50 ؛ یا از sample
RF     = Replication Factor     # 1 اگر non-cluster
SF     = Search Factor          # 1 اگر non-cluster
N_IDX  = Number of indexers / peers
```

### 8.1 Non-clustered Indexers

```text
Total_Index_Storage_GB = D × R × C
Per_Indexer_GB         = Total_Index_Storage_GB / N_IDX
```

با پیش‌فرض رسمی: `C = 0.5`

### 8.2 Clustered Indexers (مدل rawdata/TSIDX)

```text
M = 0.15×RF + 0.35×SF
Total_Cluster_Storage_GB = D × R × M
Per_Peer_GB              = Total_Cluster_Storage_GB / N_IDX
```

### 8.3 تفکیک Hot/Warm vs Cold (اختیاری ولی توصیه‌شده)

اگر سیاست شما این است که `R_hotwarm` روز روی SSD و بقیه تا `R_total` روی cold بماند:

```text
SSD_GB  = D × R_hotwarm × M
Cold_GB = D × (R_total - R_hotwarm) × M_cold
```

معمولاً برای cold همان M را می‌گذارند مگر اینکه از tsidx reduction استفاده کنید (که روی برخی searchهای ES محدودیت دارد — ES Performance reference).

### 8.4 SmartStore

```text
# Indexed daily estimate (رسمی ≈ 50%)
D_indexed = 0.5 × D

# Local cache per indexer (فرض توزیع متوازن)
Cache_Days = 90 if ES else 30          # طبق SmartStore system requirements
# حداقل عملیاتی:
Cache_Days = max(Cache_Days, 7..10)

Local_Cache_Total_GB = D_indexed × Cache_Days
Local_Cache_Per_IDX  = Local_Cache_Total_GB / N_IDX
# + فضای OS/binaries/artifacts روی همان partition

Remote_GB ≈ D × R × M_remote           # retention بلندمدت روی object store
```

### 8.5 جمع نهایی per Indexer (چک‌لیست ظرفیت)

```text
Per_Indexer_Provision_GB =
    Per_Indexer_Index_or_Cache_GB
  + DMA_Share_GB                 # اگر ES
  + ITSI_Index_Share_GB          # اگر ITSI indexes روی همین tier
  + OS_and_Splunk_Binaries_GB
  + Headroom_GB                  # توصیه عملی: 15–25% آزاد؛ و هرگز نزدیک 5GB threshold نشوید
```

---

## 9) مثال‌های end-to-end

### مثال A — Core Splunk، بدون Cluster

```text
D=200 GB/day, R=90 days, N_IDX=2, C=0.5

Total = 200 × 90 × 0.5 = 9,000 GB = 9 TB
Per_IDX = 4.5 TB  (+ OS + headroom)
Disk type: SSD for hot/warm
```

**ارجاع منطق:** Estimate your storage requirements

### مثال B — Cluster RF=3 SF=2 ، بدون SmartStore

```text
D=1,000 GB/day, R=365 days, N_IDX=10
M = 0.15×3 + 0.35×2 = 1.15

Total = 1000 × 365 × 1.15 = 419,750 GB ≈ 410 TB
Per_Peer ≈ 41 TB
```

**ارجاع منطق:** Estimate (15/35) + Buckets/clusters (RF/SF files)

### مثال C — SmartStore + ES

```text
D=2,000 GB/day, N_IDX=24, ES enabled, Retention remote=1 year

D_indexed/day total ≈ 1000 GB
Cache_Days = 90
Local_Cache_Total ≈ 1000 × 90 = 90,000 GB = 90 TB
Per_IDX local ≈ 90 TB / 24 ≈ 3.75 TB SSD/NVMe
  (+ binaries/OS روی همان partition)

Remote object store ≈ طبق M و replication طراحی SmartStore برای 365 روز
Network: 10Gbps per indexer به object store
```

**ارجاع:** SmartStore system requirements (90-day ES cache، 50% indexed، 10Gbps)

### مثال D — هم‌راستا با جدول ES Small

از Infra: Small ES = 300 GB/day ، 3 indexers.  
فرض retention hot/warm+cold قابل search = 90 روز، RF=3 SF=2:

```text
M=1.15
Total = 300 × 90 × 1.15 = 31,050 GB ≈ 30.3 TB
Per_IDX ≈ 10.1 TB SSD-capable storage
+ DMA (از صفحه DMA ES)
```

---

## 10) Virtualized / Shared Storage IOPS (مرتبط با ظرفیت عملیاتی)

ناکافی بودن Storage I/O شایع‌ترین محدودیت زیرساخت Splunk است.

مثال رسمی shared array:
- 10 indexer با عملکرد سطح SSD
- نیاز حدود **4000 IOPS × 10 = 40,000 concurrent IOPS** فقط برای indexerها
- به‌علاوه IOPS برای سایر workloadهای همان array

در ES روی VM: IOPS را روی **همه indexer nodes همزمان** تست کنید؛ thick provision ترجیح داده می‌شود.

**ارجاع:**  
[Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[ES Performance reference → virtualized environments](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

برای روش تست: ارجاع رسمی داخل Reference hardware به *How to test my storage system using FIO* در Splunk Answers.

---

## 11) الگوریتم تصمیم Storage (Flow)

```text
START
  ├─ D, R, N_IDX, Apps, Cluster?, SmartStore? را بگیر
  ├─ C = 0.5 یا از sample اندازه‌گیری کن
  │
  ├─ if SmartStore:
  │     Local = D_indexed × (90 if ES else 30)   # min 7-10 days
  │     Remote = f(D, R, RF/SF, object-store design)
  │     Disk local = NVMe/SSD
  │
  ├─ else if Cluster:
  │     Total = D × R × (0.15×RF + 0.35×SF)
  │     Split hot/warm SSD vs cold HDD/NAS
  │
  ├─ else:
  │     Total = D × R × C
  │
  ├─ if ES: add DMA from ES "Data model acceleration storage and retention"
  ├─ if ITSI: add ITSI indexes retention + 30GB KV on SH
  ├─ add OS/binaries/headroom; enforce >> 5GB free
  └─ validate IOPS (≥800 install; hot/warm SSD; cluster latency limits)
END
```

---

## 12) فهرست ارجاعات رسمی این سند

| # | مستند | بخش | کاربرد در Storage | URL |
|---|---|---|---|---|
| 1 | Estimate your storage requirements | کل موضوع | 15%/35%/50%، فرمول پایه، sample، اشاره‌ها به cluster/ES/SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| 2 | Reference hardware | Storage type by role + notes | نوع دیسک، 800 IOPS، 300GB SH، ممنوعیت NFS برای hot/warm، توقف زیر 5GB | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 3 | Buckets and indexer clusters | Data files / stages / searchability | RF کپی rawdata، SF کپی TSIDX، aging | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| 4 | SmartStore system requirements | Local storage / remote / network | cache 30 روز، ES 90 روز، 50% indexed، 10Gbps | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| 5 | Performance reference for Splunk Enterprise Security | DMA constraints | محل ذخیره DMA، ارجاع به محاسبه DMA retention | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| 6 | Plan your ITSI deployment | KV store / indexes forwarding | 30GB free، خلاصه‌ها روی indexer | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| 7 | (ارجاع متقابل) Storage requirement examples | Managing Indexers | تأیید محاسبات cluster | لینک داخل Estimate your storage requirements |
| 8 | (ارجاع متقابل) Data model acceleration storage and retention | ES Install Manual | محاسبه فضای DMA | لینک داخل Estimate your storage requirements و ES Performance reference |

---

## 13) Reminder

- 50% یک **aggregate planning estimate** است، نه ضمانت per-sourcetype.
- همیشه برای production، sample compression و مانیتورینگ واقعی دیسک/IOPS را جایگزین تخمین اولیه کنید.
- آستانه 5GB free یک hard stop برای indexing است؛ headroom عملیاتی خیلی بالاتر نگه دارید.

</div>
</div>
