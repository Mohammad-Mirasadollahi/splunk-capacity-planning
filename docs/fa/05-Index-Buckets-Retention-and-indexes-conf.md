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
  <a href="../en/05-Index-Buckets-Retention-and-indexes-conf.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/05-Index-Buckets-Retention-and-indexes-conf.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# Bucketهای Index، حجم Event و Retention در indexes.conf

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)

> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md)  
> **پیش‌نیاز:** [`02-Storage-Sizing.md`](02-Storage-Sizing.md) (ظرفیت TB) → این سند همان TB را به تنظیمات **per-index / per-volume** در `indexes.conf` تبدیل می‌کند.

---

## سرفصل

- [0) جایگاه این سند نسبت به مراحل قبل](#0-جایگاه-این-سند-نسبت-به-مراحل-قبل)
- [1) حجم Event — چگونه Daily Volume را برآورد کنیم](#1-حجم-event--چگونه-daily-volume-را-برآورد-کنیم)
  - [1.1 مسیر رسمی برنامه‌ریزی (ترجیحی)](#11-مسیر-رسمی-برنامهریزی-ترجیحی)
  - [1.2 روش تعداد Event (وقتی فقط EPS دارید)](#12-روش-تعداد-event-وقتی-فقط-eps-دارید)
  - [1.3 از حجم خام روزانه تا اندازهٔ On-Disk ایندکس](#13-از-حجم-خام-روزانه-تا-اندازه-on-disk-ایندکس)
- [2) وضعیت‌های Bucket (چرخهٔ رسمی)](#2-وضعیتهای-bucket-چرخه-رسمی)
- [3) هر انتقال Bucket چگونه محاسبه می‌شود](#3-هر-انتقال-bucket-چگونه-محاسبه-میشود)
  - [3.1 Hot → Warm](#31-hot--warm)
  - [3.2 Warm → Cold](#32-warm--cold)
  - [3.3 Cold → Frozen (بازنشستگی / Archive)](#33-cold--frozen-بازنشستگی--archive)
  - [3.4 Frozen → Thawed (بازیابی)](#34-frozen--thawed-بازیابی)
- [4) تنظیمات کلیدی indexes.conf (واقعاً چه چیزی را کنترل می‌کنند)](#4-تنظیمات-کلیدی-indexesconf-واقعا-چه-چیزی-را-کنترل-میکنند)
- [5) Volumeها — چیدمان Best Practice از روی سایزینگ قبلی](#5-volumeها--چیدمان-best-practice-از-روی-سایزینگ-قبلی)
- [6) ورک‌بوک — از اسناد ظرفیت تا indexes.conf](#6-ورکبوک--از-اسناد-ظرفیت-تا-indexesconf)
- [7) بررسی نمونهٔ Configuration (ممکن است اشتباه باشد)](#7-بررسی-نمونه-configuration-ممکن-است-اشتباه-باشد)
  - [7.1 موارد درست‌به‌نظر](#71-موارد-درستبهنظر)
  - [7.2 مشکلات / ریسک‌ها](#72-مشکلات--ریسکها)
  - [7.3 الگوی اصلاح‌شده (Best Practice)](#73-الگوی-اصلاحشده-best-practice)
- [8) مثال عددی (ایندکس Windows)](#8-مثال-عددی-ایندکس-windows)
- [9) ارجاعات رسمی این سند](#9-ارجاعات-رسمی-این-سند)
- [10) Reminder](#10-reminder)

---

## 0) جایگاه این سند نسبت به مراحل قبل

```text
01 Infrastructure  →  تعداد SH / IDX و کف CPU/RAM
02 Storage (TB)    →  حجم دیسک hot/warm/cold/SmartStore/DMA
03 Disk / media    →  SSD در برابر HDD، FS، قواعد NFS
04 IOPS            →  عملکرد همان دیسک
05 این سند         →  تبدیل TB + retention به indexes.conf
                       (volume، homePath/coldPath، freeze، archive، bucket)
```

**قاعده:** هرگز اول `maxTotalDataSizeMB` / حجم volume را از هوا ننویسید. از این‌ها مشتق کنید:

1. حجم روزانهٔ license / ingest هر ایندکس (GB/day)  
2. روزهای retention قابل جستجو  
3. فشرده‌سازی ≈ **۵۰٪** (یا اندازه‌گیری‌شده) از [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)  
4. در صورت cluster: RF/SF (سند `02`)  
5. بودجهٔ جدا برای DMA / خلاصه‌های `tstats`

---

## 1) حجم Event — چگونه Daily Volume را برآورد کنیم

دستیاب‌های Capacity و Storage رسمی Splunk از **حجم روزانهٔ داده** (GB/day) برنامه‌ریزی می‌کنند، نه از یک «اندازهٔ ثابت Event» برای همه منابع. اندازهٔ Event فقط روشی برای **برآورد** همان حجم روزانه است وقتی از EPS شروع می‌کنید.

### 1.1 مسیر رسمی برنامه‌ریزی (ترجیحی)

1. **Daily_License_GB** را اندازه بگیرید یا برآورد کنید.  
2. برای برنامه‌ریزی دیسک hot/warm/cold فشرده‌سازی ≈ **۵۰٪** را اعمال کنید (یا از نمونه bucket اندازه بگیرید).  
3. در تعداد روز retention و RF/SF طبق سند `02` ضرب کنید.

**ارجاع:** [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)

### 1.2 روش تعداد Event (وقتی فقط EPS دارید)

```text
Avg_Event_Bytes  = میانگین اندازه‌ی یک event (اندازه‌گیری‌شده؛ با تعریف license سازگار بمانید)
EPS              = رویداد بر ثانیه (peak یا average — مشخص کنید کدام)
Daily_Raw_GB     = EPS × 86400 × Avg_Event_Bytes / (1024³)
```

**اندازه‌گیری میانگین (best practice عملیاتی):**

- نمونهٔ نماینده از منبع (Windows Event Log، syslog، JSON، …).  
- یا از خود Splunk روی یک بازهٔ معلوم.  
- یک اندازهٔ جهانی فرض نکنید؛ Security ویندوز با DNS و فایروال فرق زیاد دارد.

| خانواده منبع (فقط نمونه — مال خودتان را اندازه بگیرید) | بازه تقریبی |
|---|---|
| syslog کوتاه | حدود ۲۰۰–۵۰۰ بایت |
| Windows Event Log | حدود ۰.۵–۲+ KB |
| JSON پرجزئیات / cloud | اغلب چند KB |

این بازه‌ها **ثابت رسمی Splunk نیستند**.

### 1.3 از حجم خام روزانه تا اندازهٔ On-Disk ایندکس

```text
Daily_OnDisk_GB ≈ Daily_Raw_GB × 0.5
# Cluster (سند 02):
Daily_OnDisk_GB ≈ Daily_Raw_GB × (0.15×RF + 0.35×SF)
```

سپس:

```text
Index_Searchable_TB ≈ Daily_OnDisk_GB × Retention_Days / 1024
```

همین TB قابل جستجو است که وارد `maxTotalDataSizeMB` (با headroom) و سقف volume می‌شود.

---

## 2) وضعیت‌های Bucket (چرخهٔ رسمی)

یک **index** مجموعه‌ای از **bucket**هاست. هر bucket ژورنال rawdata + tsidx (+ metadata) را برای بازهٔ زمانی محدود نگه می‌دارد.

| وضعیت | معنای رسمی | قابل جستجو؟ | ایدهٔ مسیر پیش‌فرض |
|---|---|---|---|
| **Hot** | دادهٔ تازه‌ایندکس‌شده؛ در حال نوشتن؛ یک یا چند hot per index | بله | `homePath` (`…/db`) |
| **Warm** | از hot غلتیده؛ دیگر نوشته نمی‌شود؛ تعداد زیاد | بله | همان `homePath` |
| **Cold** | از warm غلتیده؛ اغلب storage ارزان‌تر | بله | `coldPath` (`…/colddb`) |
| **Frozen** | از cold؛ **پیش‌فرض حذف**، یا در صورت تنظیم archive | خیر | مسیر archive / script |
| **Thawed** | بازیابی از archive برای جستجو | بله | `thawedPath` (`…/thaweddb`) |

**ارجاع:**  
[How the indexer stores indexes](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes)  
[Set a retirement and archiving policy](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy)

نکته SmartStore: وضعیت cold مثل مدل کلاسیک معمولاً وجود ندارد؛ retention جداگانه است (سند `02`).

---

## 3) هر انتقال Bucket چگونه محاسبه می‌شود

تنظیمات در `indexes.conf` است. چند حد می‌توانند فعال شوند؛ **هر کدام زودتر برسد** غلتش را راه می‌اندازد (سن **یا** اندازه).

### 3.1 Hot → Warm

| کنترل | نقش رسمی | مقادیر معمول |
|---|---|---|
| `maxDataSize` | سقف اندازه hot (MB) قبل از roll | `auto` = **۷۵۰ MB**؛ `auto_high_volume` = **۱۰ GB** (۶۴بیت). طبق spec برای ایندکس‌های ≳ **~۱۰ GB/day** از `auto_high_volume` استفاده کنید |
| `maxHotBuckets` | حداکثر hot همزمان | معمولاً کوچک / `auto` |
| `maxHotIdleSecs` | roll در صورت بیکاری | اختیاری |
| `maxHotSpanSecs` | محدود کردن بازه زمانی داخل یک hot | اختیاری |
| Restart ایندکسر | hot را به warm می‌غلتاند | عملیاتی |

```text
Target_Hot_Bucket_MB = maxDataSize
Hot_Buckets_Open    ≤ maxHotBuckets
```

**ارجاع:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf)

### 3.2 Warm → Cold

| کنترل | نقش رسمی |
|---|---|
| `maxWarmDBCount` | حداکثر تعداد warm (پیش‌فرض **۳۰۰**). با عبور، قدیمی‌ترین warm → cold. `0` = هرچه زودتر به cold. سقف قانونی **۴۲۹۴۹۶۷۲۹۵** |
| `homePath.maxDataSizeMB` | سقف اندازه hot+warm روی `homePath`؛ با عبور، warmهای قدیمی به cold می‌روند |
| `maxVolumeDataSizeMB` روی volume hot/warm | می‌تواند بین ایندکس‌های همان volume trim کند |

```text
Home_Cap_MB ≈ Daily_OnDisk_MB × HotWarm_Days × Safety
```

اگر `maxWarmDBCount` خیلی بزرگ باشد (مثلاً ۴۲۹۴۹۶۷۲۹۵)، غلتش بر اساس **تعداد** عملاً خاموش است و باید به **سقف اندازه** اعتماد کنید.

### 3.3 Cold → Frozen (بازنشستگی / Archive)

Cold → frozen وقتی **یکی** از این‌ها برسد:

| کنترل | نقش رسمی |
|---|---|
| `frozenTimePeriodInSecs` | سن: همهٔ eventهای bucket باید از این ثانیه قدیمی‌تر باشند (پیش‌فرض ≈ **۶ سال**) |
| `maxTotalDataSizeMB` | سقف اندازه hot+warm+cold ایندکس (پیش‌فرض **۵۰۰۰۰۰** MB). thawed را شامل نمی‌شود |
| `coldPath.maxDataSizeMB` | سقف فقط cold |
| Volume trim روی cold | قدیمی‌ترین‌ها بین ایندکس‌های volume |

**هشدار رسمی:** `maxTotalDataSizeMB` می‌تواند **قبل از** رسیدن به سن freeze فعال شود. سیاست پیش‌فرض frozen = **حذف**.

**Archive:**

- `coldToFrozenDir = /path/to/archive` **یا**  
- `coldToFrozenScript = ...`  
- اگر هر دو باشند، **`coldToFrozenDir` اولویت دارد**

```text
Retention_Days = frozenTimePeriodInSecs / 86400
# مثال: 5184000 → ۶۰ روز
```

**ارجاع:**  
[Set a retirement and archiving policy](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy)  
[Archive indexed data](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata)  
[indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf)

### 3.4 Frozen → Thawed (بازیابی)

Bucketهای archive‌شده به `thawedPath` برمی‌گردند. قید رسمی: **`thawedPath` نباید با `volume:` تعریف شود** — مسیر واقعی فایل‌سیستم لازم است.

**ارجاع:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf)؛ [Restore archived data](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata)

---

## 4) تنظیمات کلیدی indexes.conf (واقعاً چه چیزی را کنترل می‌کنند)

| تنظیم | کنترل می‌کند | پیوند با برنامه‌ریزی |
|---|---|---|
| `homePath` | محل hot + warm | دیسک سریع (SSD) از اسناد `02`/`03` |
| `coldPath` | محل cold | اغلب دیسک بزرگ‌تر / ارزان‌تر |
| `thawedPath` | بازیابی archive | مسیر writable؛ **نه** `volume:` |
| `maxDataSize` | اندازه roll مربوط به hot | `auto` در برابر `auto_high_volume` |
| `homePath.maxDataSizeMB` | ردپای hot+warm | روزهای روی دیسک سریع × روزانه on-disk |
| `coldPath.maxDataSizeMB` | ردپای cold | اختیاری |
| `maxTotalDataSizeMB` | سقف searchable ایندکس (H+W+C) | retention × روزانه on-disk (+ headroom) |
| `frozenTimePeriodInSecs` | freeze زمانی | SLA retention بر حسب ثانیه |
| `coldToFrozenDir` / `Script` | archive به‌جای حذف | compliance |
| `maxWarmDBCount` | تعداد warm قبل از chill | یا خیلی بزرگ + اتکا به سقف اندازه |
| `tstatsHomePath` | خلاصه DMA / tsidx | volume خلاصهٔ جدا (SSD/NVMe) |
| `[volume:…]` + `maxVolumeDataSizeMB` | بودجهٔ مشترک دیسک | مجموع سقف ایندکس‌ها ≤ volume ≤ FS |

---

## 5) Volumeها — چیدمان Best Practice از روی سایزینگ قبلی

Volume رسمی اجازه می‌دهد چند ایندکس یک بودجهٔ دیسک را شریک شوند (`maxVolumeDataSizeMB` قدیمی‌ترین bucketها را بین ایندکس‌های همان volume جمع می‌کند).

**چیدمان توصیه‌شده (غیر SmartStore):**

```text
[volume:hotwarm]     → مسیر SSD/NVMe   # homePath
[volume:cold]        → دیسک بزرگ       # coldPath
[volume:summaries]   → SSD/NVMe        # tstatsHomePath / DMA  ★ جدا از cold
# archive frozen     → معمولاً مسیر مطلق یا mount آرشیو
```

**قواعد:**

1. **یک path فایل‌سیستم → عمدتاً یک نقش volume.** دو stanza با `path=` یکسان و دو `maxVolumeDataSizeMB` بزرگ، ظرفیت را در ذهن **دوبرابر** حساب می‌کنند در حالی که یک mount است.  
2. DMA / `tstatsHomePath` را روی volume **summary** بگذارید، نه قاطی با cold روی HDD.  
3. `maxVolumeDataSizeMB` سقف دیتابیس‌هایی است که به volume ارجاع می‌دهند — لزوماً «اندازه mount» نیست. برای FS فضای آزاد بگذارید.  
4. `thawedPath` مطلق بماند.

**ارجاع:** [indexes.conf](https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf)؛ [Configure index storage](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage)

---

## 6) ورک‌بوک — از اسناد ظرفیت تا indexes.conf

```text
ورودی‌ها (از اسناد 01–02):
  D_raw_GB_day_index   = حجم روزانه license همین ایندکس
  R_days               = retention قابل جستجو
  HotWarm_days         = روزهای نگهداشت روی دیسک سریع (≤ R_days)
  Comp                 = 0.5 (یا اندازه‌گیری‌شده)
  Headroom             = 1.15 … 1.30

Daily_OnDisk_MB = D_raw_GB_day_index × Comp × 1024

maxTotalDataSizeMB    ≈ Daily_OnDisk_MB × R_days × Headroom
homePath.maxDataSizeMB≈ Daily_OnDisk_MB × HotWarm_days × Headroom
frozenTimePeriodInSecs= R_days × 86400

maxDataSize =
  auto_high_volume   اگر D_raw_GB_day_index ≳ 10
  auto               در غیر این صورت

coldToFrozenDir       = اگر باید ARCHIVE شود نه حذف
tstatsHomePath        = volume:summaries/<index>/datamodel_summary
```

---

## 7) بررسی نمونهٔ Configuration (ممکن است اشتباه باشد)

نمونهٔ داده‌شده:

```ini
[volume:_splunk_summaries]
path = /cold
maxVolumeDataSizeMB = 8600000

[volume:hotwarm]
path = /hot
maxVolumeDataSizeMB = 9300000

[volume:cold]
path = /cold
maxVolumeDataSizeMB = 8600000

[volume:frozen]
path = /frozen

[windows]
homePath = volume:hotwarm/windows/db
coldPath = volume:cold/windows/colddb
thawedPath = /cold/windows/thaweddb
homePath.maxDataSizeMB = 1721600
maxWarmDBCount = 4294967295
frozenTimePeriodInSecs = 5184000
maxDataSize = auto_high_volume
coldToFrozenDir = /frozen/windows/frozendb
tstatsHomePath = volume:_splunk_summaries/windows/datamodel_summary
maxTotalDataSizeMB = 3443200
```

قطعهٔ دوم:

```ini
[volume:summary]
path=/opt/data/

[_audit]
tstatsHomePath = volume:summary/audit/datamodel_summary
```

### 7.1 موارد درست‌به‌نظر

| مورد | ارزیابی |
|---|---|
| جدا کردن `homePath` روی `/hot` و `coldPath` روی `/cold` | هم‌راستا با توصیهٔ رسمی برای cold روی storage جدا/ارزان‌تر |
| `thawedPath` مطلق زیر `/cold/...` | شرط «thawedPath با volume تعریف نشود» را رعایت می‌کند |
| `frozenTimePeriodInSecs = 5184000` | = **۶۰ روز** |
| `maxTotalDataSizeMB = 3443200` ≈ **۲ برابر** `homePath.maxDataSizeMB` | با الگوی «تقریباً نصف hot/warm و نصف cold» برای پنجرهٔ ۶۰روزه **سازگار است اگر** ingest واقعی جور باشد (§۸) |
| `maxDataSize = auto_high_volume` | درست **اگر** واقعاً ≳ ~۱۰ GB/day |
| `coldToFrozenDir` | به‌جای حذف خاموش، archive می‌کند |
| `maxWarmDBCount = 4294967295` | غلتش مبتنی بر تعداد را عملاً خاموش می‌کند؛ وابسته به سقف اندازه — معتبر **اگر** آن سقف عمدی باشد |

### 7.2 مشکلات / ریسک‌ها

1. **`volume:_splunk_summaries` و `volume:cold` هر دو `path = /cold` با `maxVolumeDataSizeMB = 8600000` دارند.**  
   - هر دو روی **یک** فایل‌سیستم رقابت می‌کنند.  
   - جمع ۸۶۰۰+۸۶۰۰ در برنامه‌ریزی ظرفیت برای یک mount **غلط** است.  
   - خلاصه DMA روی همان cold HDD با bucketهای cold بر سر IOPS/فضا می‌جنگد.

2. **`volume:frozen` در `[windows]` استفاده نشده** (`coldToFrozenDir` مسیر مطلق است). شلوغی بی‌ضرر یا ناتمامی تنظیمات.

3. **`coldPath.maxDataSizeMB` نیست.** اتکا به `maxTotalDataSizeMB` + volume trim فقط وقتی درست است که حساب volume صادقانه باشد.

4. **نمونه دوم:** `[volume:summary]` بدون `maxVolumeDataSizeMB` — خلاصه‌ها تا پر شدن mount رشد می‌کنند. `[_audit]` فقط `tstatsHomePath` را override می‌کند؛ اگر `homePath`/`coldPath`/`thawedPath` از default بیاید OK است — حتماً تأیید کنید.

5. **اعداد MB را با ingest واقعی چک کنید** (§۸).

### 7.3 الگوی اصلاح‌شده (Best Practice)

```ini
[volume:hotwarm]
path = /hot
maxVolumeDataSizeMB = <بودجه hot/warm سند 02 روی همه ایندکس‌ها>

[volume:cold]
path = /cold
maxVolumeDataSizeMB = <بودجه cold سند 02>

[volume:summaries]
path = /summaries
maxVolumeDataSizeMB = <بودجه DMA سند 02>

[windows]
homePath = volume:hotwarm/windows/db
coldPath = volume:cold/windows/colddb
thawedPath = /cold/windows/thaweddb
homePath.maxDataSizeMB = <Daily_OnDisk_MB × HotWarm_days × headroom>
maxTotalDataSizeMB = <Daily_OnDisk_MB × R_days × headroom>
frozenTimePeriodInSecs = <R_days × 86400>
maxDataSize = auto_high_volume
coldToFrozenDir = /frozen/windows/frozendb
tstatsHomePath = volume:summaries/windows/datamodel_summary
```

---

## 8) مثال عددی (ایندکس Windows)

از اعداد نمونه:

```text
R_days                 = 5184000 / 86400 = 60
maxTotalDataSizeMB     = 3443200
homePath.maxDataSizeMB = 1721600

اگر نزدیک روز ۶۰ سقف اندازه bind شود:
  Daily_OnDisk_MB ≈ 3443200 / 60 ≈ 57387 MB/day ≈ ۵۶ GB/day on-disk

خام روزانه با فشرده‌سازی ≈۵۰٪:
  Daily_Raw_GB ≈ 56 / 0.5 ≈ ۱۱۲ GB/day   # فقط همین ایندکس، روی همین کپی ایندکسر
```

سقف hot/warm ≈ نصف کل → حدود **۳۰ روز** داده on-disk روی `/hot` اگر رشد پایدار باشد (`1721600 / 57387 ≈ ۳۰`). این طراحی فقط وقتی منسجم است که ingest واقعی ویندوز نزدیک همین باشد. اگر مثلاً ۱۰ GB/day raw باشد، این سقف‌ها خیلی بزرگ‌اند؛ اگر بیشتر باشد، قبل از ۶۰ روز freeze می‌شود.

**چک با اندازه Event:**

```text
فرض Avg_Event = 1200 bytes و Daily_Raw ≈ 112 GB
EPS ≈ 112 × 1024³ / (86400 × 1200) ≈ ≈ ۱۲۷۰ event/s میانگین
```

اگر EPS×اندازه اندازه‌گیری‌شده‌تان دور از این است، با ورک‌بوک §۶ اعداد را **از نو** بسازید — به نمونه کور اعتماد نکنید.

---

## 9) ارجاعات رسمی این سند

| # | موضوع | URL |
|---|---|---|
| 1 | How the indexer stores indexes | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/HowSplunkstoresindexes |
| 2 | Set a retirement and archiving policy | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Setaretirementandarchivingpolicy |
| 3 | Configure index storage | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Configureindexstorage |
| 4 | Archive indexed data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Archiveindexeddata |
| 5 | Restore archived data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Restorearchiveddata |
| 6 | indexes.conf spec | https://docs.splunk.com/Documentation/Splunk/latest/Admin/Indexesconf |
| 7 | Estimate your storage requirements | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements |
| 8 | Use multiple partitions for index data | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/Usemultiplepartitionsforindexdata |

---

## 10) Reminder

تنظیمات بازنشستگی می‌توانند داده را **بدون تأیید** حذف کنند. سقف سن/اندازه را با سیاست archive عمدی جفت کنید. هر رقم MB را با حجم روزانهٔ اندازه‌گیری‌شده اعتبارسنجی کنید — stanzaهای نمونه نقطهٔ شروع‌اند، نه حقیقت مطلق.

</div>
</div>
