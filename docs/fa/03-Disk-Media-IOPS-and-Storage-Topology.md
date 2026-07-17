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
  <a href="../en/03-Disk-Media-IOPS-and-Storage-Topology.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/03-Disk-Media-IOPS-and-Storage-Topology.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# رسانه دیسک، IOPS و توپولوژی Storage در Splunk

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)





> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md) — فهرست اصلی استنادهای رسمی

---

## سرفصل

- [0) ارتباط این سند با بقیه اسناد](#0-ارتباط-این-سند-با-بقیه-اسناد)
- [1) موضع رسمی درباره RAID](#1-موضع-رسمی-درباره-raid)
- [2) نوع Storage به ازای نقش (ماتریس رسانه)](#2-نوع-storage-به-ازای-نقش-ماتریس-رسانه)
- [3) قواعد IOPS و چیدمان Volume](#3-قواعد-iops-و-چیدمان-volume)
- [4) Network Storage: NFS، DFS، SAN، NAS، CIFS/SMB](#4-network-storage-nfs-dfs-san-nas-cifssmb)
- [5) فایل‌سیستم‌های پشتیبانی‌شده](#5-فایلسسیستمهای-پشتیبانی‌شده)
- [6) ترجیح دیسک محلی برای SmartStore](#6-ترجیح-دیسک-محلی-برای-smartstore)
- [7) مجازی‌سازی، Thick/Thin و Shared Array](#7-مجازیسازی-thickthin-و-shared-array)
- [8) نکات Storage در Cloud Vendor](#8-نکات-storage-در-cloud-vendor)
- [9) اعتبارسنجی Storage (FIO و تست همزمان)](#9-اعتبارسنجی-storage-fio-و-تست-همزمان)
- [10) چک‌لیست تصمیم](#10-چکلیست-تصمیم)
- [11) فهرست ارجاعات رسمی](#11-فهرست-ارجاعات-رسمی)

---

## 0) ارتباط این سند با بقیه اسناد

| سند | پاسخ می‌دهد به |
|---|---|
| `01-Infrastructure-Sizing` | تعداد نود / CPU / RAM |
| `02-Storage-Sizing` | چند **GB/TB** لازم است (فشرده‌سازی، RF/SF، روزهای cache) |
| **این سند (`03`)** | **چه نوع دیسک / مسیر / IOPS / فایل‌سیستم / network storage** استفاده شود |

Capacity Planning Manual صراحتاً می‌گوید **ناکافی بودن Storage I/O شایع‌ترین محدودیت** در زیرساخت Splunk است.

**ارجاع:**  
[Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

---

## 1) موضع رسمی درباره RAID

### 1.1 آنچه مستندات فعلی Capacity Planning مشخص کرده‌اند

در موضوع فعلی **Reference hardware** (Splunk Enterprise **Latest 10.4** روی docs.splunk.com)، Splunk این‌ها را مشخص می‌کند:

- **کلاس رسانه:** SSD، HDD، NVMe، SAN، NAS، network file systems  
- **کف عملکرد:** مثلاً **≥ 800 sustained IOPS** برای volume نصب Splunk و برای Search Head مبتنی بر HDD  
- **قواعد جای‌گذاری:** هرگز **hot/warm** روی network volume نباشد؛ volume ایندکس جدا از OS/swap  

اما سطح‌های RAID مثل RAID 0 / 1 / 5 / 6 / 10 را **تجویز نمی‌کند**.

**ارجاع:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — بخش‌های *What storage type should I use for a role?* و *Notes about optimizing…* (در این موضوع جدول سطح RAID وجود ندارد).

### 1.2 نحوه برخورد با RAID در طراحی (وفادار به مستند)

| رویکرد | هم‌راستا با مستند رسمی؟ |
|---|---|
| هر RAID (یا بدون RAID / NVMe نرم‌افزاری) که **نوع رسانه + sustained IOPS** لازم برای آن نقش را تأمین کند | بله — نتیجه با Reference hardware یکی است |
| ادعای «Splunk الزاماً RAID 10 می‌خواهد» به‌عنوان قاعده فعلی Capacity Planning | **خیر** — در Reference hardware فعلی گفته نشده |
| استفاده از معماری Partner/TAP که ممکن است RAID داشته باشد | مجاز به‌عنوان راهنمای vendor؛ Splunk می‌گوید سخت‌افزار خاصی را **endorse** نمی‌کند |

**ارجاع:**  
[Reference hardware → Considerations for deploying Splunk software on partner infrastructure](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 1.3 جمع‌بندی عملی

طراحی Storage باید طوری باشد که:

1. Hot/Warm (+ DMA) روی **SSD** باشد (یا cache محلی SmartStore روی **NVMe/SSD**)  
2. Volume نصب و SH مبتنی بر HDD به **≥ 800 sustained IOPS** برسند  
3. Cold/Frozen می‌توانند HDD/SAN/NAS/NFS باشند — با رعایت قواعد NFS/CIFS در Installation Manual  

RAID جزئیات پیاده‌سازی زیر این نتایج است؛ در Capacity Planning فعلی یک سطح RAID جداگانه اجباری اعلام نشده است.

---

## 2) نوع Storage به ازای نقش (ماتریس رسانه)

جدول رسمی Reference hardware:

| Role | نوع Storage توصیه‌شده | خلاصه نکات رسمی |
|---|---|---|
| **Search Head** | SSD، HDD | بار ad-hoc/scheduled زیاد → ترجیح **SSD**. HDD باید **≥ 800 sustained IOPS** بدهد. حداقل **300 GB** فضای dedicated. |
| **Indexer: Hot + Warm + data model storage** | **SSD** | خواندن/نوشتن پرترافیک. مسیر hot و warm به‌طور پیش‌فرض یکی است؛ **DMA** هم پیش‌فرض همان مسیر را استفاده می‌کند. |
| **Indexer: SmartStore** | **NVMe یا SSD** + remote object store | cache محلی پرترافیک برای I/O کوتاه‌مدت و بازیابی bucket از object storage. |
| **Indexer: Cold** | HDD، SAN، NAS، Network file systems | معمولاً ارزان‌تر/کندتر؛ latency جستجو به عملکرد Storage وابسته است؛ cold ناپایدار می‌تواند indexing را هم تحت تأثیر بگذارد. |
| **Indexer: Frozen** | SAN، NAS، Network file systems، HDD | مسیر آرشیو؛ bucketهای frozen به‌طور **پیش‌فرض حذف** می‌شوند مگر archive شوند. |

**ارجاع:**  
[Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 2.1 نگاشت رسانه به لایه Bucket

| کلاس داده / Bucket | راهنمای رسمی رسانه |
|---|---|
| Hot | SSD (با warm روی همان مسیر پیش‌فرض) |
| Warm | SSD (همان مسیر hot) |
| Data model acceleration | پیش‌فرض همان مسیر hot/warm → SSD |
| Cold | HDD / SAN / NAS / NFS (با محدودیت‌های NFS) |
| Frozen | SAN / NAS / NFS / HDD |
| SmartStore cache | NVMe یا SSD محلی + object store |

**ارجاع:** همان جدول Reference hardware؛ جزئیات SmartStore در  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 3) قواعد IOPS و چیدمان Volume

### 3.1 کف‌های سخت از Reference hardware

| قاعده | الزام رسمی |
|---|---|
| Volume **نصب** Splunk | **≥ 800 sustained IOPS** |
| Search Head روی **HDD** | **≥ 800 sustained IOPS** |
| ظرفیت Search Head | حداقل **300 GB** dedicated |
| Index در برابر OS | Storage ایندکس روی volume **جدا** از OS/swap (volume مربوط به OS/swap برای داده Splunk توصیه نمی‌شود) |
| فضای آزاد | همیشه free space داشته باشید؛ با کم شدن فضا عملکرد کم می‌شود؛ اگر free space volume ایندکس **&lt; 5 GB** شود indexing **متوقف** می‌شود |
| جای Hot/Warm | **هرگز** روی network volume |

**ارجاع:**  
[Reference hardware → Notes about optimizing Splunk software and storage usage](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.2 مثال رسمی IOPS روی Shared Array

برای array مشترکی که باید عملکرد سطح SSD بدهد:

```text
IOPS_needed_for_indexers ≈ 4000 IOPS × N_indexers
```

مثال: **10 indexer** → **40,000 concurrent IOPS** فقط برای indexerها، **به‌علاوه** IOPS سایر workloadهای همان array.

**ارجاع:**  
[Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.3 اهمیت I/O در VM

Installation Manual: Splunk به دسترسی پایدار به منابع نیاز دارد، **به‌خصوص disk I/O** برای indexing. اجرا داخل VM یا کنار VMهای دیگر می‌تواند indexing و search را تضعیف کند.

**ارجاع:**  
[System requirements → Splunk Enterprise and virtual machines](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

---

## 4) Network Storage: NFS، DFS، SAN، NAS، CIFS/SMB

### 4.1 Reference hardware (Capacity Planning)

- **هرگز** bucketهای **hot و warm** را روی network volume نگذارید — latency شبکه عملکرد indexing را به‌شدت کم می‌کند.  
- Shareهای شبکه مثل **DFS** یا **NFS** می‌توانند برای **cold** استفاده شوند؛ جستجو روی داده network کندتر است.  
- Cold همچنین **SAN / NAS / network file systems**؛ Frozen نیز SAN / NAS / NFS / HDD را فهرست کرده است.

**ارجاع:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 4.2 NFS — قواعد Installation Manual (جزئیات الزامی)

وقتی NFS برای indexing استفاده می‌شود، پیامدهای file-level storage را در نظر بگیرید. راهنمای Splunk: برای indexing داده، **storage سطح block را به file-level ترجیح دهید**.

اگر باز هم NFS استفاده می‌کنید (لینک قابل‌اطمینان، پهنای‌باند بالا، latency کم، یا NFS خوشه‌ای HA فروشنده)، عملکرد/قابلیت/یکپارچگی داده را با vendor تأیید کنید.

**راهنماهای اجباری NFS:**

| قاعده | جزئیات |
|---|---|
| Hot / Warm | **نباید** روی NFS باشد. فقط **cold یا frozen** روی NFS. |
| اشتراک در Indexer cluster | cold/frozen روی NFS را بین اعضای cluster **اشتراک نگذارید** (نقطه شکست واحد). |
| Soft mount | **پشتیبانی نمی‌شود**. |
| Hard mount | فقط **hard** NFS mount با Splunk قابل اتکا است. |
| Hard FSO / hard link | پیاده‌سازی NFS باید از hard filesystem object link (hard link / inode مشترک) پشتیبانی کند. با vendor تأیید کنید. |
| Attribute caching | attribute caching را **خاموش نکنید**. اگر اپ دیگری نیاز به خاموشی دارد، برای Splunk mount **جدا** با caching روشن بدهید. |
| WAN | NFS روی WAN **استفاده نشود** — مشکل عملکرد و احتمال **از دست رفتن داده**. |

**ارجاع:**  
[System requirements → Considerations regarding Network File System (NFS)](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 4.3 CIFS / SMB (ویندوز)

فقط روی share میزبانی‌شده توسط **ماشین‌های Windows** و برای:

- ذخیره **cold یا frozen**

همچنین:

- مجوز write در سطح **file و share** برای کاربر متصل.  
- CIFS شخص‌ثالث باید با کلاینت Splunk سازگار باشد.  
- به mapped network drive (مثل `Y:\`) ایندکس نکنید؛ Splunk ایندکس با drive letter غیر فیزیکی را نادیده می‌گیرد.

**ارجاع:**  
[System requirements → Considerations regarding CIFS/SMB](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

### 4.4 SAN / NAS (طبق فهرست Reference hardware)

| کاربرد | در جدول رسمی آمده؟ |
|---|---|
| Cold | بله — HDD، **SAN**، **NAS**، network file systems |
| Frozen | بله — **SAN**، **NAS**، network file systems، HDD |
| Hot / Warm | **خیر** — hot/warm باید **SSD** باشد و network volume برای hot/warm ممنوع است |

**ارجاع:** جدول نوع Storage در Reference hardware

---

## 5) فایل‌سیستم‌های پشتیبانی‌شده

جدول رسمی برای ذخیره **داده ایندکس**:

| Platform | File systems |
|---|---|
| **Linux** | ext3، ext4، btrfs، **XFS**، NFS 3/4 (با محدودیت‌های NFS) |
| Windows | NTFS، FAT32، CIFS (با caveat)، SMB (با caveat) |
| Solaris / FreeBSD / macOS / AIX | عمدتاً در زمینه Universal Forwarder — جدول کامل در System requirements |

اگر فایل‌سیستمی **خارج** از جدول باشد، Splunk ممکن است `locktest` را اجرا کند؛ شکست یعنی آن FS/پروتکل **مناسب نیست**.

**ارجاع:**  
[System requirements → Supported file systems and distributed file system protocols](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)

---

## 6) ترجیح دیسک محلی برای SmartStore

| استقرار | Storage محلی ترجیحی (رسمی) |
|---|---|
| Indexer لینوکس on-prem | ترجیح **SSD** |
| AWS | **NVMe SSD** Instance Storage (مثلاً i3en / i3) |
| GCP | ترجیح n1-highmem-64 یا n1-highmem-32 + **zonal SSD** PD |
| Azure | سری E با حافظه بالا (Edv4 / Edsv4) + **SSD** |
| OS برای SmartStore on-prem | همه ماشین‌ها همان **Linux 64-bit**؛ سیستم‌عامل دیگر برای on-prem SmartStore پشتیبانی نمی‌شود |

اندازه cache (ظرفیت) در `02-Storage-Sizing.md` است (۳۰ روز indexed / **۹۰ روز برای ES**). شبکه به object store: بهینه **10 Gbps**.

**ارجاع:**  
[SmartStore system requirements → Local storage requirements / Network](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 7) مجازی‌سازی، Thick/Thin و Shared Array

### 7.1 Capacity Planning (پلتفرم)

- Hypervisor باید منابع **reserved** مطابق reference specs بدهد.  
- Indexer روی VM حدود **۱۰ تا ۱۵٪** در consume داده کندتر از bare-metal؛ search مشابه.  
- Shared storage باید contention سایر VMها و IOPS کافی per role را پوشش دهد (بخش ۳.۲).

**ارجاع:**  
[Reference hardware → Virtualized Infrastructures](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 7.2 Enterprise Security (راهنمای اضافه برای provision)

از راهنمای ES درباره محیط مجازی:

- CPU/RAM معادل bare-metal؛ منابع را **reserve** کنید؛ oversubscribe نکنید.  
- IOPS را روی **همه نودهای indexer همزمان** تست کنید.  
- ترجیح **thick provisioning**؛ **thin** ممکن است عملکرد را آسیب بزند.  
- اگر hyper-threading روشن است، تعداد vCPU را نسبت به physical core **دو برابر** حساب کنید (مثال ES: ۳۲ vCPU به‌جای ۱۶ physical core).

**ارجاع:**  
[ES Install → Performance reference / DeploymentPlanning (virtualized environments)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

---

## 8) نکات Storage در Cloud Vendor

- گزینه‌های Storage کلود از نظر عملکرد و قیمت بسیار متفاوت‌اند.  
- برای حفظ عملکرد search/indexing، همان توصیه‌های نوع Storage بر اساس نقش در Reference hardware را دنبال کنید.  
- vCPU تعریف vendor است و ممکن است فقط بخشی از توان یک core کامل باشد.

**ارجاع:**  
[Reference hardware → Self-managed Splunk Enterprise in the cloud](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

جفت instance/disk برای SmartStore: بخش ۶.

---

## 9) اعتبارسنجی Storage (FIO و تست همزمان)

1. Reference hardware به راهنمای تست اشاره می‌کند: **How to test my storage system using FIO** در Splunk Answers (لینک از بخش نوع Storage).  
2. تأیید **≥ 800 sustained IOPS** روی volume نصب (و SH مبتنی بر HDD).  
3. برای shared array / VM: مدل `4000 × N_indexers` را به‌عنوان مثال رسمی سطح SSD چک کنید، سپس workloadهای دیگر را اضافه کنید.  
4. برای ES: تست IOPS روی **همه indexerها با هم**.  
5. تأیید کنید hot/warm روی NFS/DFS/CIFS نیست؛ mountهای NFS برای cold **hard** هستند، attribute caching روشن است، WAN نیست.

**ارجاعها:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[System requirements (NFS)](https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements)  
[ES DeploymentPlanning](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

---

## 10) چک‌لیست تصمیم

```text
□ نقش مشخص است (SH / IDX hot-warm / cold / frozen / SmartStore cache)
□ رسانه با جدول Reference hardware می‌خواند (SSD برای hot-warm+DMA و …)
□ Volume نصب ≥ 800 sustained IOPS؛ ایندکس جدا از OS/swap
□ سیاست free space خیلی بالاتر از آستانه 5 GB روی volume ایندکس
□ Hot/Warm روی network volume نیست
□ اگر NFS برای cold/frozen: hard mount، پشتیبانی hard link، attr cache روشن، بدون WAN، بدون اشتراک SPOF بین peerهای cluster
□ اگر CIFS/SMB: فقط cold/frozen میزبان Windows؛ بدون mapped drive برای indexing
□ فایل‌سیستم در جدول پشتیبانی (مثلاً Linux: ext4/XFS/…)
□ اگر VM/shared array: IOPS رزرو شده؛ مدل 4000×N؛ برای ES ترجیحاً thick
□ اگر SmartStore: SSD/NVMe محلی طبق جدول پلتفرم؛ 10 Gbps به object store
□ سطح RAID (اگر هست) فقط برای رسیدن به موارد بالا انتخاب شده — نه به‌عنوان الزام جداگانه Splunk
□ برای ریاضی IOPS بر اساس RAID / تعداد دیسک / معماری، سند `04-IOPS-Sizing-by-Storage-Architecture.md` را کامل کنید
```

---

## 11) فهرست ارجاعات رسمی

| # | مستند | بخش | چه چیزی را تثبیت می‌کند | URL |
|---|---|---|---|---|
| 1 | Reference hardware | Storage type + notes | ماتریس SSD/HDD/NVMe/SAN/NAS/NFS؛ 800 IOPS؛ 300 GB SH؛ ممنوعیت network برای hot/warm؛ توقف زیر 5 GB؛ IOPS مدل 4000×N | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 2 | System requirements | File systems؛ NFS؛ CIFS/SMB؛ VM | لیست FS؛ قواعد NFS/CIFS؛ ترجیح block-level؛ اهمیت disk I/O در VM | https://docs.splunk.com/Documentation/Splunk/latest/Installation/Systemrequirements |
| 3 | SmartStore system requirements | Local storage / network | SSD/NVMe بر اساس پلتفرم؛ 10 Gbps | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |
| 4 | ES Performance / Deployment planning | Virtualized environments | Thick در برابر thin؛ تست IOPS همزمان؛ دو برابر کردن vCPU با HT | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security |

---

## یادآوری

این سند **فقط** آنچه manuals رسمی فعلی Splunk درباره رسانه/توپولوژی دیسک گفته‌اند را ثبت می‌کند. عمداً سطح RAIDای را که در Reference hardware فعلی نیست به‌عنوان الزام Splunk جعل نمی‌کند. اگر راهنماهای Partner/TAP چیدمان RAID پیشنهاد کردند، آن‌ها معماری vendor هستند و باید همچنان به نتایج رسانه و IOPS بالا برسند.

</div>
</div>
