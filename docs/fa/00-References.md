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
  <a href="../en/00-References.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/00-References.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# مراجع رسمی (اول این را بخوانید)

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)


> **Premium apps canonical:** برنامه‌ریزی ES روی **help.splunk.com ES 8.5** است (مسیر کلاسیک `/ES/latest/Install/DeploymentPlanning` روی docs.splunk.com resolve نمی‌شود). ITSI Plan روی **help.splunk.com ITSI 5.0** است (جلوتر از docs.splunk.com `/ITSI/latest/` وقتی هنوز روی 4.21.x باشد). با `--es-version` / `--itsi-version` بالا ببرید.



---

## سرفصل

- [0) نحوه استفاده از این فایل مرجع](#0-نحوه-استفاده-از-این-فایل-مرجع)
- [1) نگاشت اسناد محلی ↔ منابع رسمی](#1-نگاشت-اسناد-محلی--منابع-رسمی)
- [2) منابع رسمی اصلی (قابل کلیک)](#2-منابع-رسمی-اصلی-قابل-کلیک)
- [3) برگه تقلب ادعا → منبع](#3-برگه-تقلب-ادعا--منبع)
- [4) جدول کامل URLهای Canonical](#4-جدول-کامل-urlهای-canonical)
- [5) قاعده استناد داخل اسناد](#5-قاعده-استناد-داخل-اسناد)

---

## 0) نحوه استفاده از این فایل مرجع

1. هر وقت به **URL رسمی Splunk** برای یک ادعا نیاز دارید از اینجا شروع کنید.  
2. بعد راهنمای محلی متناظر (`01` تا `04`) را باز کنید.  
3. هر راهنمای محلی هم **داخل متن** کنار بخش‌ها ارجاع دارد؛ این فایل **فهرست جلویی** است.  
4. لینک‌های Capacity مربوط به Enterprise با `/latest/` هستند (الان **10.4**). ES/ITSI روی help.splunk.com هستند (**8.5** / **5.0**).

**ترتیب مطالعه:**

```text
00-References  →  01-Infrastructure  →  02-Storage (TB)  →  03-Disk/Media  →  04-IOPS  →  05-Index/Buckets/indexes.conf
```

**ماشین‌حساب همراه (SCPcalc):** UI زنده در [`/calc/`](../../calc/) (GitHub Pages). توپولوژی، نگهداری، حجم کل/دیسک (اختیاری) و منابع را در یک ویزارد پر کنید (بدون Mode جدا). با **خروجی لینک** پلن را به اشتراک بگذارید یا در **ورود** Paste کنید. جزئیات: [`scpcalc/README.md`](../../scpcalc/README.md#save--export--import).

---

## 1) نگاشت اسناد محلی ↔ منابع رسمی

| سند محلی | manuals رسمی اصلی |
|---|---|
| [01-Infrastructure-Sizing](01-Infrastructure-Sizing.md) | Capacity Planning (Intro، Dimensions، Components، Reference hardware، Performance summary)؛ ES 8.5 planning؛ ITSI 5.0 Plan؛ SmartStore |
| [02-Storage-Sizing](02-Storage-Sizing.md) | Estimate your storage requirements؛ Buckets and indexer clusters؛ SmartStore؛ Reference hardware؛ ES / ITSI |
| [03-Disk-Media-IOPS-and-Storage-Topology](03-Disk-Media-IOPS-and-Storage-Topology.md) | Reference hardware (انواع Storage)؛ System requirements (FS / NFS / CIFS)؛ SmartStore؛ مجازی‌سازی ES |
| [04-IOPS-Sizing-by-Storage-Architecture](04-IOPS-Sizing-by-Storage-Architecture.md) | Reference hardware (800 IOPS، 4000×N)؛ System requirements؛ SmartStore؛ IOPS همزمان / thick در ES |
| [05-Index-Buckets-Retention-and-indexes-conf](05-Index-Buckets-Retention-and-indexes-conf.md) | How indexes are stored؛ retirement/archiving؛ Configure index storage؛ indexes.conf؛ Estimate storage |

---

## 2) منابع رسمی اصلی (قابل کلیک)

### Capacity Planning Manual

| موضوع | URL |
|---|---|
| Introduction to capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| Dimensions of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| Components of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| **Reference hardware** | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| Summary of performance recommendations | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |

### Installation Manual

| موضوع | URL |
|---|---|
| System requirements (filesystems، NFS، CIFS، VM I/O) | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |

### Managing Indexers and Clusters

| موضوع | URL |
|---|---|
| Buckets and indexer clusters | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| SmartStore system requirements | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| About SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore |

### Distributed Search

| موضوع | URL |
|---|---|
| Whether to colocate management components | https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents |

### Premium Apps

| موضوع | URL |
|---|---|
| ES minimum specifications (production) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| ES considerations for scaling deployments | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| ES Performance reference | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| Plan your ITSI deployment (5.0) | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| PCI deployment planning | https://docs.splunk.com/Documentation/PCI/latest/Install/DeploymentPlanning |

---

## 3) برگه تقلب ادعا → منبع

| ادعای استفاده‌شده در این بسته | منبع رسمی |
|---|---|
| ناکافی بودن Storage I/O شایع‌ترین محدودیت است | Reference hardware → بخش نوع Storage |
| Hot/warm (+ DMA) → **SSD**؛ SmartStore محلی → **NVMe یا SSD** | جدول نوع Storage در Reference hardware |
| Volume نصب / SH روی HDD → **≥ 800 sustained IOPS** | Notes در Reference hardware |
| Search Head → حداقل **300 GB** dedicated | جدول نوع Storage در Reference hardware |
| هرگز hot/warm روی network؛ NFS/DFS برای cold (جستجوی کندتر) | Notes در Reference hardware |
| اگر free space volume ایندکس **&lt; 5 GB** شود indexing متوقف می‌شود | Notes در Reference hardware |
| Array اشتراکی سطح SSD ≈ **4000 IOPS × N indexer** | Reference hardware → Virtualized Infrastructures |
| Indexer روی VM حدود **۱۰–۱۵٪** در ingest کندتر از bare-metal | Reference hardware → Virtualized Infrastructures |
| Latency کلاستر: indexer **≤ 100 ms**، SHC **≤ 200 ms** | Reference hardware → Network latency limits |
| تخمین فشرده‌سازی ≈ **۱۵٪ rawdata + ۳۵٪ TSIDX ≈ ۵۰٪** | Estimate your storage requirements |
| مثال: ۱۰۰ GB/day × ۳۰ روز → **۱.۵ TB** | Estimate your storage requirements |
| کپی‌های RF دارای rawdata؛ کپی‌های searchable با SF دارای TSIDX | Buckets and indexer clusters |
| کش SmartStore **۳۰ روز** indexed؛ با ES **۹۰ روز** | SmartStore system requirements |
| شبکه SmartStore ترجیحاً **۱۰ Gbps** | SmartStore system requirements |
| NFS: بدون hot/warm؛ فقط hard mount؛ بدون WAN؛ بدون soft mount | System requirements → NFS |
| ترجیح **block-level** به file-level برای indexing | System requirements → NFS |
| FS ایندکس لینوکس: ext3/ext4/btrfs/XFS (+ NFS با caveat) | System requirements → Supported file systems |
| ES: SH/IDX ≥ **16 physical cores / 32 GB / 32 vCPU** | حداقل مشخصات ES 8.5 |
| مبنای سایزینگ CPU = **physical cores**؛ با HT به VM **۲× vCPU** بدهید | جداول جفت Reference hardware + حداقل ES (16 physical / 32 vCPU) |
| هایپروایزر: CPU/RAM را **reserve** کنید؛ **oversubscribe نکنید** | Virtualization در Reference hardware + ES performance reference |
| موازی‌سازی Splunk (pipeline) فقط با **CPU اضافه بالاتر از حداقل** | Reference hardware pipeline sets؛ یادداشت parallelization در ITSI Plan |
| جدول مقیاس ES با ستون **detections** | Considerations for scaling ES 8.5 |
| ES: ترجیح thick؛ تست IOPS همزمان روی همه indexerها | Performance reference ES 8.5 |
| حداقل سخت‌افزار ITSI؛ جداول مثال KPI؛ KV ≥ **۳۰ GB** آزاد | ITSI 5.0 Plan |
| جدول تعداد SH×IDX بر اساس users × حجم روزانه | Summary of performance recommendations |
| Indexer مرجع حداقل حدود **۳۰۰ GB/day** با بار search | Summary of performance recommendations / Reference hardware |
| مستندات Capacity فعلی سطح RAID اجباری نمی‌کنند | Reference hardware (بدون جدول RAID) — اسناد محلی 03/04 |
| چرخه bucket: Hot→Warm→Cold→Frozen→Thawed | How the indexer stores indexes / Retirement policy |
| `maxDataSize` auto=750MB؛ auto_high_volume=10GB (۶۴بیت)؛ high-volume اگر ≳10GB/day | indexes.conf |
| Freeze با سن (`frozenTimePeriodInSecs`) **یا** اندازه (`maxTotalDataSizeMB`) — هر کدام زودتر | Set a retirement and archiving policy |
| پیش‌فرض frozen = حذف مگر `coldToFrozenDir` / script | Archive indexed data |
| `thawedPath` نمی‌تواند `volume:` باشد | indexes.conf |
| حجم روزانه از EPS × میانگین event؛ on-disk ≈ ۵۰٪ raw برای برنامه‌ریزی | Estimate storage + روش event در سند ۰۵ |

---

## 4) جدول کامل URLهای Canonical

همان IDهای [`VERSION.md`](../../VERSION.md):

| ID | عنوان | Canonical latest URL |
|---|---|---|
| cap-intro | Introduction to capacity planning | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| cap-dimensions | Dimensions of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| cap-components | Components of a Splunk Enterprise deployment | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| cap-reference-hw | Reference hardware | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| cap-perf-summary | Summary of performance recommendations | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| cap-storage-estimate | Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| install-sysreq | System requirements | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |
| idx-buckets-clusters | Buckets and indexer clusters | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Bucketsandclusters |
| idx-smartstore-req | SmartStore system requirements | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| idx-smartstore-about | About SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/AboutSmartStore |
| dist-colocate-mgmt | Colocate management components | https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents |
| es-min-specs | ES minimum specifications (production) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| es-scaling | ES considerations for scaling deployments | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| es-perf-ref | ES Performance reference | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |
| itsi-plan | Plan your ITSI deployment (5.0) | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| idx-how-stores | How the indexer stores indexes | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes |
| idx-retire | Set a retirement and archiving policy | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy |
| idx-configure-storage | Configure index storage | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage |
| idx-archive | Archive indexed data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata |
| admin-indexes-conf | indexes.conf | https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf |
| pci-plan | PCI deployment planning | https://docs.splunk.com/Documentation/PCI/latest/Install/DeploymentPlanning |

---

## 5) قاعده استناد داخل اسناد

در راهنماهای `01` تا `05`، هر بخش substantive باید یکی از این‌ها را داشته باشد:

- **ارجاع:** / **Source:** با لینک به یکی از URLهای بالا، **یا**  
- ارجاع به همین فایل به‌همراه ردیف ادعا در §۳  

کمک‌های صرفاً مهندسی (مثل جبر جریمه write در سند `04`) باید با برچسب **مهندسی** بمانند و به‌عنوان الزام RAID رسمی Splunk مطرح نشوند.

---

## ادامه به راهنماهای سایزینگ

1. [01 — سایزینگ زیرساخت](01-Infrastructure-Sizing.md)  
2. [02 — سایزینگ Storage](02-Storage-Sizing.md)  
3. [03 — رسانه دیسک، IOPS و توپولوژی](03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [04 — IOPS بر اساس معماری Storage](04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [05 — Bucketها، حجم Event و indexes.conf](05-Index-Buckets-Retention-and-indexes-conf.md)

</div>
</div>
