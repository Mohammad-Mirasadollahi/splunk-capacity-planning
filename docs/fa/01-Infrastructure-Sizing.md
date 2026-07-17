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
  <a href="../en/01-Infrastructure-Sizing.md" style="text-decoration:none;">English</a>
  <span aria-hidden="true">·</span>
  <a href="../fa/01-Infrastructure-Sizing.md" aria-current="page" style="font-weight:700; text-decoration:none;">فارسی</a>
  <span style="opacity:0.55; margin-inline-start:0.5rem;">(پیش‌فرض: English)</span>
</nav>


# طرح سایزینگ زیرساخت Splunk (Infrastructure Sizing)

> **دامنه:** بدنه‌ی سند (زیرساخت / Storage / دیسک / IOPS)  
> **کانال مستند:** Enterprise **`/latest/`** (resolve **10.4**) · ES **8.5** (help.splunk.com) · ITSI **5.0** (help.splunk.com) · همگام‌سازی 2026-07-17  
> **آپدیت:** `python3 tools/sync_latest_docs.py --apply` · [`00-References.md`](00-References.md) · [`VERSION.md`](../../VERSION.md)







> **مراجع (اول بخوانید):** [`00-References.md`](00-References.md) — فهرست اصلی استنادهای رسمی

---

## سرفصل

- [0) چطور از این سند استفاده کنید](#0-چطور-از-این-سند-استفاده-کنید)
- [1) منطق کلی سایزینگ Splunk (چرا و بر چه اساسی)](#1-منطق-کلی-سایزینگ-splunk-چرا-و-بر-چه-اساسی)
  - [1.1 هدف Capacity Planning](#11-هدف-capacity-planning)
  - [1.2 ابعاد اثرگذار روی Performance](#12-ابعاد-اثرگذار-روی-performance)
  - [1.3 دو فاکتور اصلی برای Distributed Deployment](#13-دو-فاکتور-اصلی-برای-distributed-deployment)
- [2) اجزای معماری (Components) که باید سایز شوند](#2-اجزای-معماری-components-که-باید-سایز-شوند)
  - [2.1 نقش‌های اصلی](#21-نقشهای-اصلی)
  - [2.2 منطق جداسازی Search و Index](#22-منطق-جداسازی-search-و-index)
- [3) Reference Hardware رسمی (مبنای سخت‌افزار)](#3-reference-hardware-رسمی-مبنای-سختافزار)
  - [3.1 Single-instance (S1 در SVA) — حداقل Production](#31-single-instance-s1-در-sva-حداقل-production)
  - [3.2 Search Head — حداقل](#32-search-head-حداقل)
  - [3.3 Indexer — سه سطح](#33-indexer-سه-سطح)
  - [3.4 Management Components](#34-management-components)
  - [3.5 نوع Storage به ازای نقش (خلاصه Infrastructure)](#35-نوع-storage-به-ازای-نقش-خلاصه-infrastructure)
  - [3.6 محدودیت Latency در Cluster](#36-محدودیت-latency-در-cluster)
  - [3.7 Virtualization و Cloud](#37-virtualization-و-cloud)
  - [3.8 Physical در برابر Logical (vCPU) — نگاشت رسمی](#38-physical-در-برابر-logical-vcpu--نگاشت-رسمی)
  - [3.9 موازی‌سازی Virtualization در برابر موازی‌سازی Splunk](#39-موازی‌سازی-virtualization-در-برابر-موازی‌سازی-splunk)
- [4) جدول رسمی تعداد Search Head و Indexer (Performance Recommendations)](#4-جدول-رسمی-تعداد-search-head-و-indexer-performance-recommendations)
  - [4.1 Daily Indexing Volume × Total Users](#41-daily-indexing-volume-total-users)
  - [4.2 روش محاسبه عملی از روی جدول](#42-روش-محاسبه-عملی-از-روی-جدول)
- [5) Premium Apps — الزامات و جداول مقیاس‌پذیری](#5-premium-apps-الزامات-و-جداول-مقیاسپذیری)
- [6) Splunk Enterprise Security (ES)](#6-splunk-enterprise-security-es)
  - [6.1 سخت‌افزار حداقل رسمی ES (Production)](#61-سختافزار-حداقل-رسمی-es-production)
  - [6.2 اصول معماری ES از نظر Infra](#62-اصول-معماری-es-از-نظر-infra)
  - [6.3 Indexerهای تست ES (مرجع تست)](#63-indexerهای-تست-es-مرجع-تست)
  - [6.4 جدول مقیاس‌پذیری ES (Data ingestion / Indexers / Detections)](#64-جدول-مقیاسپذیری-es-data-ingestion--indexers--detections)
  - [6.5 راهنمای Scale کردن Search Head در ES](#65-راهنمای-scale-کردن-search-head-در-es)
  - [6.6 محدودیت‌های سایزینگ ES (Constraints)](#66-محدودیتهای-سایزینگ-es-constraints)
  - [6.7 Virtualized ES](#67-virtualized-es)
  - [6.8 روش سایزینگ Infra برای محیط ES (گام‌به‌گام)](#68-روش-سایزینگ-infra-برای-محیط-es-گامبهگام)
- [7) Splunk IT Service Intelligence (ITSI)](#7-splunk-it-service-intelligence-itsi)
  - [7.1 سخت‌افزار حداقل رسمی ITSI](#71-سختافزار-حداقل-رسمی-itsi)
  - [7.2 قواعد معماری مهم ITSI](#72-قواعد-معماری-مهم-itsi)
  - [7.3 متغیرهای کلیدی Capacity Planning در ITSI](#73-متغیرهای-کلیدی-capacity-planning-در-itsi)
  - [7.4 جداول مثال رسمی ITSI](#74-جداول-مثال-رسمی-itsi)
  - [7.5 روش سایزینگ Infra برای ITSI (گام‌به‌گام)](#75-روش-سایزینگ-infra-برای-itsi-گامبهگام)
  - [7.6 Scale کردن SHC برای ITSI](#76-scale-کردن-shc-برای-itsi)
- [8) Splunk App for PCI Compliance](#8-splunk-app-for-pci-compliance)
- [9) سایر نقش‌ها و Appهای مرتبط (خلاصه Infra)](#9-سایر-نقشها-و-appهای-مرتبط-خلاصه-infra)
  - [9.1 نکته SmartStore مرتبط با Infra (نه فقط Storage)](#91-نکته-smartstore-مرتبط-با-infra-نه-فقط-storage)
- [10) الگوریتم کامل سایزینگ زیرساخت (چک‌لیست اجرایی)](#10-الگوریتم-کامل-سایزینگ-زیرساخت-چکلیست-اجرایی)
  - [مرحله A — ورودی‌ها](#مرحله-a-ورودیها)
  - [مرحله B — تعداد نود پایه (Platform)](#مرحله-b-تعداد-نود-پایه-platform)
  - [مرحله C — اعمال Premium Apps](#مرحله-c-اعمال-premium-apps)
  - [مرحله D — مشخصات هر نود](#مرحله-d-مشخصات-هر-نود)
  - [مرحله E — شبکه و مجازی‌سازی](#مرحله-e-شبکه-و-مجازیسازی)
  - [مرحله F — خروجی سند Infra](#مرحله-f-خروجی-سند-infra)
- [11) فهرست ارجاعات رسمی استفاده‌شده در این سند](#11-فهرست-ارجاعات-رسمی-استفادهشده-در-این-سند)
- [12) Reminder رسمی Splunk](#12-reminder-رسمی-splunk)

---
## 0) چطور از این سند استفاده کنید

1. ورودی‌های کسب‌وکار را جمع کنید (حجم روزانه، کاربران همزمان، Appها، retention).
2. ابتدا با جدول Performance Recommendations تعداد Search Head / Indexer را برآورد کنید.
3. سپس Reference Hardware مناسب هر نقش را انتخاب کنید (Minimum / Mid-range / High-performance).
4. اگر ES یا ITSI دارید، الزامات سخت‌افزاری و جداول مقیاس‌پذیری همان App را **روی** برآورد پایه اعمال کنید.
5. در پایان، با سند Storage سایز دیسک را جداگانه محاسبه کنید.

---

## 1) منطق کلی سایزینگ Splunk (چرا و بر چه اساسی)

### 1.1 هدف Capacity Planning

مستند رسمی می‌گوید Splunk Enterprise تقریباً برای هر ظرفیت قابل گسترش است، ولی برای استفاده از این مقیاس‌پذیری باید برنامه‌ریزی کنید. راهنما شامل:
- راهنمای سخت‌افزار سطح بالا
- نحوه مصرف منابع در شرایط مختلف
- Reference Hardware
- پرسشنامه عملکرد برای تصمیم‌گیری مقیاس‌دهی

**ارجاع:**  
[Introduction to capacity planning for Splunk Enterprise](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise) — Capacity Planning Manual

### 1.2 ابعاد اثرگذار روی Performance

قبل از هر محاسبه نود، این ابعاد را مشخص کنید:

| بُعد | اثر |
|---|---|
| Amount of incoming data | هرچه ingest بیشتر، زمان پردازش به event بیشتر |
| Amount of indexed data | با رشد index، پهنای‌باند I/O برای store/search بیشتر می‌شود |
| Number of concurrent users | کاربران همزمان → منابع بیشتر برای search/report/dashboard |
| Number of saved searches | تعداد بالای saved search → ظرفیت بیشتر برای اجرای به‌موقع |
| Types of search | نوع search رفتار indexer را تغییر می‌دهد (CPU-bound vs disk-bound) |
| Whether you run Splunk apps | Appها/Solutionها نیاز منابع اختصاصی دارند |

**نکته رسمی:** بهینه‌سازی تک‌تک این ابعاد، تضمین peak performance نیست؛ همبستگی آن‌ها در use case شما مهم است. مثلاً ingest کم + user زیاد ≠ ingest زیاد + user کم.

**ارجاع:**  
[Dimensions of a Splunk Enterprise deployment](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment) — Capacity Planning Manual

### 1.3 دو فاکتور اصلی برای Distributed Deployment

در معماری توزیع‌شده، دو عامل مهم‌ترین ورودی سایزینگ هستند:
1. **Daily data ingest volume**
2. **Concurrent search volume**

- لایه Indexing: اولویت با **high-performance storage**
- لایه Search: اولویت با **CPU cores و RAM**

افزایش ظرفیت Search Head، بار search روی Indexer را بالا می‌برد و معمولاً باید Indexer هم scale شود. مقیاس‌دهی می‌تواند Vertical (سخت‌افزار قوی‌تر) یا Horizontal (نود بیشتر) باشد.

**ارجاع:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — بخش *Reference host specifications for distributed deployments*

---

## 2) اجزای معماری (Components) که باید سایز شوند

### 2.1 نقش‌های اصلی

| Component | نقش در سایزینگ |
|---|---|
| **Indexer** | پردازش و ذخیره داده؛ primary data store |
| **Search head** | توزیع search به indexerها؛ تجمیع نتایج |
| **Forwarder** | ارسال داده به indexer؛ معمولاً خودشان index نمی‌کنند |
| **Deployment server** | توزیع app/config به forwarder و نودهای non-clustered |
| **Indexer cluster** | replication برای availability و جلوگیری از data loss |
| **Management components** | Cluster Manager، License Manager، Monitoring Console، SHC Deployer، Agent Management، Heavy Forwarder |

**ارجاع:**  
[Components of a Splunk Enterprise deployment](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment) — Capacity Planning Manual  
[Reference hardware → Recommended hardware for management components](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 2.2 منطق جداسازی Search و Index

در distributed deployment، indexing و search به tierهای جدا تقسیم می‌شوند تا مستقل scale شوند بدون اختلال متقابل. این اصل پایه Splunk Validated Architectures (SVA) است که Reference Hardware بر آن بنا شده.

**ارجاع:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — مقدمه و بخش distributed deployments

---

## 3) Reference Hardware رسمی (مبنای سخت‌افزار)

> همه مشخصات زیر از **Reference hardware** هستند. عبارت «x86 64-bit» یعنی CPU مبتنی بر Intel Sandy Bridge یا جدیدتر، یا AMD Bulldozer 15h GEN3 یا جدیدتر، با پشتیبانی **AVX / SSE4.2 / AES-NI** (الزامی برای App Key Value Store).

**ارجاع پایه این بخش:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.1 Single-instance (S1 در SVA) — حداقل Production

| مشخصه | مقدار رسمی |
|---|---|
| CPU | 12 physical cores یا 24 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |
| Network | 1 GbE NIC (اختیاری: NIC دوم برای management) |
| OS | 64-bit Linux یا Windows (طبق Supported OS) |
| Storage | طبق جدول نقش Indexer در همان مستند |

اگر به headroom برای search concurrency یا App بیشتر نیاز دارید، به mid-range یا high-performance indexer بروید. وقتی single instance دیگر پاسخگو نیست، به مدل‌های distributed در SVA بروید.

### 3.2 Search Head — حداقل

| مشخصه | مقدار رسمی |
|---|---|
| CPU | 16 physical cores یا 32 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |
| Storage | SSD یا HDD با ≥ 800 sustained IOPS؛ حداقل 300 GB dedicated |
| نکته عملکرد | هر search فعال تا **1 CPU core** مصرف می‌کند؛ scheduled + ad-hoc را حساب کنید |

### 3.3 Indexer — سه سطح

#### Minimum Indexer
| مشخصه | مقدار |
|---|---|
| CPU | 12 physical cores / 24 vCPU @ ≥ 2 GHz |
| RAM | 12 GB |

#### Mid-range Indexer (overhead برای search concurrency بیشتر)
| مشخصه | مقدار |
|---|---|
| CPU | 24 physical cores / 48 vCPU @ ≥ 2 GHz |
| RAM | 64 GB |

#### High-performance Indexer (throughput و concurrency بحرانی؛ Premium Apps)
| مشخصه | مقدار |
|---|---|
| CPU | 48 physical cores / 96 vCPU @ ≥ 2 GHz |
| RAM | 128 GB |

### 3.4 Management Components

با همان مشخصات single-instance شروع کنید و بر اساس مقیاس deployment تنظیم کنید. برای جزئیات دقیق‌تر، Splunk حساب/Sales را توصیه می‌کند. برای colocation:
[Whether to colocate management components](https://docs.splunk.com/Documentation/Splunk/latest/DistSearch/Colocatemanagementcomponents) (Distributed Deployment Manual) — لینک ارجاعی داخل Reference hardware.

اگر Heavy Forwarder در لایه intermediate دارید و منابع آزاد است، می‌توانید multiple pipeline sets برای توزیع بهتر داده پیکربندی کنید (ارجاع داخل Reference hardware به *Manage pipeline sets for index parallelization*).

### 3.5 نوع Storage به ازای نقش (خلاصه Infrastructure)

| Role | نوع Storage توصیه‌شده | نکات رسمی |
|---|---|---|
| Search Head | SSD یا HDD | HDD ≥ 800 IOPS؛ SH با ad-hoc/scheduled زیاد → SSD؛ حداقل 300 GB |
| Indexer Hot/Warm + DMA | **SSD** | مسیر hot/warm و DMA به‌طور پیش‌فرض یکسان |
| Indexer SmartStore | NVMe/SSD + Object Store | cache محلی + remote store |
| Indexer Cold | HDD / SAN / NAS / NFS | جستجو روی cold کندتر است |
| Indexer Frozen | SAN / NAS / NFS / HDD | پیش‌فرض: delete پس از freeze |

**قواعد رسمی بهینه‌سازی Storage (سطح Infra):**
- Volume نصب Splunk ≥ 800 sustained IOPS
- Index storage جدا از OS/swap باشد
- Indexing متوقف می‌شود اگر free space volume ایندکس‌ها < **5 GB** شود
- **هرگز** hot/warm را روی network volume نگذارید

**ارجاع:**  
[Reference hardware → What storage type should I use for a role?](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.6 محدودیت Latency در Cluster

| مورد | حد رسمی | اثر تجاوز |
|---|---|---|
| Indexer cluster nodes | ≤ **100 ms** | کندی indexing و recovery |
| Search head cluster | ≤ **200 ms** | تأثیر روی captain election |

جدول رسمی اثر latency روی Index time (1 TB) و recovery:

| Network latency | Cluster Index time (1 TB) | Cluster node recovery |
|---|---|---|
| < 100 ms | 6202 s | 143 s |
| 300 ms | 6255 s (+1%) | 1265 s (+884%) |
| 600 ms | 7531 s (+21%) | 3048 s (+2131%) |

**ارجاع:**  
[Reference hardware → Network latency limits for clustered deployments](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.7 Virtualization و Cloud

- Hypervisor باید منابع **reserved** مطابق مشخصات بالا بدهد.
- Indexer روی VM حدود **10–15%** کندتر از bare-metal برای consume داده؛ search تقریباً مشابه bare-metal.
- Shared storage باید IOPS کافی برای همه instanceها همزمان داشته باشد. مثال رسمی: 10 indexer با SSD-level → حدود **4000 IOPS × 10 = 40,000 concurrent IOPS** فقط برای indexerها.
- در cloud، vCPU لزوماً برابر physical core کامل نیست؛ طبق تعریف vendor است.

**ارجاع:**  
[Reference hardware → Virtualized Infrastructures / Self-managed Splunk Enterprise in the cloud](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

### 3.8 Physical در برابر Logical (vCPU) — نگاشت رسمی

> **واحد برنامه‌ریزی = physical CPU cores.** هسته‌های منطقی / vCPU جدا فهرست می‌شوند و معمولاً با hyper-threading برابر **۲ × physical** هستند.

| اصطلاح | معنی در مستندات Splunk | چیزی که باید تأمین کنید |
|---|---|---|
| **Physical CPU cores** | هسته‌های واقعی سوکت (بدون شمارش دوبل HT) | **مبنای سایزینگ** (مثلاً SH حداقل **۱۶ physical**، indexer حداقل **۱۲ physical**، ES SH/IDX **۱۶ physical**) |
| **Logical / vCPU** | threadهای OS/hypervisor؛ با HT ≈ **۲ × physical** | همین تعداد vCPU را به VM بدهید (مثلاً ES **۳۲ vCPU** برای **۱۶ physical**) |
| **Cloud vCPU** | سهم تعریف‌شده توسط vendor | ممکن است **کمتر** از یک physical کامل باشد — فرض نکنید ۱ cloud vCPU = ۱ physical |

**نمونه‌های رسمی جفت‌شده:**

| نقش | Physical | Logical / vCPU | منبع |
|---|---|---|---|
| Combined / S1 حداقل | 12 | 24 | [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) |
| Search head حداقل | 16 | 32 | Reference hardware |
| Indexer حداقل | 12 | 24 | Reference hardware |
| Indexer mid-range | 24 | 48 | Reference hardware |
| Indexer high-performance | 48 | 96 | Reference hardware |
| ES search head / indexer (production) | **16 physical CPU cores** | **32 vCPU** | [حداقل مشخصات ES 8.5](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment) |
| ITSI search head | 16 الزامی (۲۴+ توصیه‌شده) | 32 الزامی (۴۸+ توصیه‌شده) | [ITSI 5.0 Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) |

**قاعده این پک و ماشین‌حساب:**  
با HT روشن: `vCPU_to_assign = 2 × physical_cores`. اگر HT خاموش است، همچنان باید تعداد **physical** را تأمین کنید؛ نمی‌توانید الزام ۱۶ physical را با ۱۶ thread روی ۸ هسته physical برآورده کنید.

### 3.9 موازی‌سازی Virtualization در برابر موازی‌سازی Splunk

این دو **متفاوت‌اند** — قاطی نکنید.

| موضوع | مجاز؟ | راهنمای رسمی |
|---|---|---|
| **Oversubscription CPU هایپروایزر** (اشتراک همان هسته‌های physical بین چند VM) | **خیر** برای production | برای هر guest کل CPU و RAM را **reserve** کنید؛ oversubscribe نکنید. راهنمای مجازی‌سازی ES: CPU/RAM معادل bare-metal + reserve. |
| **Hyper-threading** (thread منطقی روی هر physical) | **بله (انتظار می‌رود)** | جداول Reference و ES هم physical و هم ۲× vCPU را می‌دهند. با HT، ستون **vCPU** را به VM بدهید. |
| **موازی‌سازی نرم‌افزاری Splunk** (pipeline sets / index parallelization / batch-mode search) | **بله، وقتی CPU اضافه دارید** | HF/indexer: چند pipeline set وقتی منابع آزاد است ([Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)). ITSI: اگر CPU ایندکسر از حداقل **بیشتر** شد، می‌توانید parallelization را برای use caseهای خاص روشن کنید ([ITSI Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)). |
| **هم‌زمانی search** | هسته برنامه‌ریزی کنید | هر search فعال تا **۱ CPU core** مصرف می‌کند (Reference hardware → search head). |

**چک‌لیست عملی:**

1. ابتدا **physical cores** را از جدول نقش (یا کف ES/ITSI) بگیرید.  
2. روی VM با HT: `vCPU = 2 × physical` و آن ظرفیت را **reserve** کنید — بدون oversubscribe.  
3. فقط وقتی guest بالاتر از حداقل هسته اضافه دارد، تنظیمات **pipeline / parallelization** اسپلانک را روشن کنید.  
4. هرگز با oversubscribe هایپروایزر «ظرفیت» نسازید.

**ارجاعها:**  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) · [ES 8.5 minimum specifications](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment) · [ES 8.5 performance reference (virtualized)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security) · [ITSI 5.0 Plan](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

---

## 4) جدول رسمی تعداد Search Head و Indexer (Performance Recommendations)

> این جدول **guideline** است؛ بر اساس use case اصلاح کنید.  
> یک indexer با minimum reference hardware می‌تواند تا حدود **300 GB/day** ingest کند و هم‌زمان search load را پشتیبانی کند.

**ارجاع:**  
[Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations) — Capacity Planning Manual  
[Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware) — برای تعریف reference machine

### 4.1 Daily Indexing Volume × Total Users

| Total Users | < 2 GB/day | 2–300 GB/day | 300–600 GB/day | 600 GB–1 TB/day | 1–2 TB/day | 2–3 TB/day |
|---|---|---|---|---|---|---|
| < 4 | 1 combined | 1 combined | 1 SH + 2 IDX | 1 SH + 3 IDX | 1 SH + 7 IDX | 1 SH + 10 IDX |
| تا 8 | 1 combined | 1 SH + 1 IDX | 1 SH + 2 IDX | 1 SH + 3 IDX | 1 SH + 8 IDX | 1 SH + 12 IDX |
| تا 16 | 1 SH + 1 IDX | 1 SH + 1 IDX | 1 SH + 3 IDX | 2 SH + 4 IDX | 2 SH + 10 IDX | 2 SH + 15 IDX |
| تا 24 | 1 SH + 1 IDX | 1 SH + 2 IDX | 2 SH + 3 IDX | 2 SH + 6 IDX | 2 SH + 12 IDX | 3 SH + 18 IDX |
| تا 48 | 1 SH + 2 IDX | 1 SH + 2 IDX | 2 SH + 4 IDX | 2 SH + 7 IDX | 3 SH + 14 IDX | 3 SH + 21 IDX |

### 4.2 روش محاسبه عملی از روی جدول

**ورودی‌ها:**
- `D` = Daily ingest (GB/day)
- `U` = Total concurrent users (تقریبی طبق ردیف جدول)

**خروجی:**
- `N_SH`, `N_IDX` از جدول بالا

**مثال:**  
`D = 800 GB/day`, `U = 12` → ردیف «up to 16»، ستون «600 GB to 1 TB/day» → **2 Search Heads + 4 Indexers**

سپس برای هر Indexer مشخصات Minimum/Mid/High را انتخاب کنید:
- بدون Premium App و search متوسط → Minimum یا Mid-range
- ES / ITSI / search سنگین → Mid-range یا High-performance (طبق بخش‌های بعد)

---

## 5) Premium Apps — الزامات و جداول مقیاس‌پذیری

Reference hardware صریحاً می‌گوید Premium Apps ممکن است بیش از reference specs منابع بخواهند و باید مستند همان App را ببینید. مثال‌های رسمی:
- Splunk Enterprise Security
- Splunk IT Service Intelligence
- Splunk App for PCI

**ارجاع:**  
[Reference hardware → Premium Splunk app requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)

---

## 6) Splunk Enterprise Security (ES)

> **خط مستند:** ES **8.5** روی [help.splunk.com](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning) (نه docs.splunk.com کلاسیک `/ES/7.3.3/`).

### 6.1 سخت‌افزار حداقل رسمی ES (Production)

| Machine role | Minimum CPU | Minimum RAM | Minimum vCPU |
|---|---|---|---|
| Search head | **16 physical CPU cores** | **32 GB** | **32 vCPU** |
| Indexer | **16 physical CPU cores** | **32 GB** | **32 vCPU** |

همین کف برای peerهای SHC نیز مانند SH standalone اعمال می‌شود. با افزایش بار، به mid-range / high-performance reference بروید.

**ارجاع:**  
[Minimum specifications for a production deployment (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment)

### 6.2 اصول معماری ES از نظر Infra

از موضوعات planning / performance مربوط به ES **8.5**:

| موضوع | حکم رسمی |
|---|---|
| Preferred architecture | Distributed search (نه single-instance برای production) |
| Search Head | Dedicated SH یا Dedicated SHC |
| Apps روی همان SH | فقط CIM-compatible (مثلاً PCI Compliance + Add-on Builder مجاز) |
| Real-time | ES از indexed real-time استفاده می‌کند؛ خاموش کردنش ظرفیت indexing را کم می‌کند |
| SHC | بار search روی indexer را زیاد می‌کند → indexer بیشتر یا CPU بیشتر |
| ES + ITSI | روی یک SH/SHC مشترک **پشتیبانی نمی‌شود** (از مستند ITSI نیز تأیید شده) |
| Monitoring Console روی ES SH | فقط standalone mode |
| OS برای SHC ES | فقط Linux-based SHC؛ Windows SHC پشتیبانی نمی‌شود |

**ارجاع:**  
[Performance reference for Splunk Enterprise Security (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 6.3 Indexerهای تست ES (مرجع تست)

در تست‌های عملکرد ES، indexerها مطابق reference hardware با **32 GB RAM و 16 CPU cores** بوده‌اند و OS همه SH/Indexer باید 64-bit باشد.

**ارجاع:** همان صفحه Performance reference — بخش *Performance test results*

### 6.4 جدول مقیاس‌پذیری ES (Data ingestion / Indexers / Detections)

در ES 8.5 ستون **detections** جایگزین برچسب قدیمی «correlation searches» شده است:

| Deployment size | Data ingestion / day | Number of indexers | Number of detections |
|---|---|---|---|
| Small | 300 GB | 3 | 20 |
| Mid-range | 1 TB | 10 | 60 |
| Mid-range to large | 625 GB/day تا 15 TB/day | 24 | 60 |
| Large | 15 TB/day | 150 | 100 |
| Largest tested (SHC on-prem) | 45 TB (skip search ~4.9%) | 240 | 60 |
| Largest tested (single SH on-prem) | 25 TB (skip search ~1%) | 300 | — |

**ارجاع:**  
[Considerations for scaling deployments (ES 8.5)](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments)

### 6.5 راهنمای Scale کردن Search Head در ES

| Factor | چه چیزی را زیاد کنید |
|---|---|
| Concurrent ad-hoc زیاد | CPU + RAM |
| Real-time زیاد یا login همزمان زیاد | CPU |
| تعداد زیاد **detections** فعال | RAM |
| Asset/Identity lookup بزرگ | RAM |

### 6.6 محدودیت‌های سایزینگ ES (Constraints)

| معیار | محدودیت |
|---|---|
| Detection search load | تعداد detections + supporting searches |
| Data ingestion volume | حجم ingest به ES |
| DMA load | تعداد DM شتاب‌گرفته، نوع/cardinality داده، حجم accelerated |
| Indexer cluster | single-site یا multi-site |
| Retention | سیاست TSIDX |

**هشدار رسمی برای > 15 TB/day:** برخی تنظیمات معمول Splunk Enterprise در حضور ES دیگر کافی نیست؛ DMA روی عملکرد cluster اثر می‌گذارد؛ با Field Architect کار کنید.

**ارجاع:** بخش *Constraints impacting performance* در Performance reference مربوط به ES 8.5

### 6.7 Virtualized ES

- همان CPU/RAM معادل bare-metal
- Reserve همه منابع؛ oversubscribe نکنید
- IOPS را روی **همه indexerها همزمان** تست کنید
- Thick provision؛ thin ممکن است performance را بزند
- اگر hyper-threading روشن است: vCPU را **دو برابر** physical cores حساب کنید (مثال رسمی: 32 vCPU به‌جای 16 physical)

**ارجاع:**  
[Performance reference (ES 8.5) → virtualized environments](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

### 6.8 روش سایزینگ Infra برای محیط ES (گام‌به‌گام)

```text
1) D_es = حجم روزانه داده‌ای که وارد use case امنیتی / ES می‌شود
2) از جدول ES (بخش 6.4) N_IDX و تعداد تقریبی detections را بخوانید
3) SH را Dedicated کنید؛ اگر concurrency/detections بالا است → SHC
4) هر SH/IDX ≥ کف ES (16 physical cores / 32 GB / 32 vCPU)؛
   با افزایش بار Mid-range (24c/64GB) یا High-performance
5) اگر SHC دارید، N_IDX را نسبت به حالت single SH افزایش دهید
6) برای ≥ 1 TB/day با ES → مشورت Professional Services (توصیه رسمی ES)
7) Storage جداگانه طبق سند Storage (+ DMA)
```

**مثال عددی:**  
هدف: 300 GB/day امنیتی، حدود 20 detections  
→ طبق جدول Small: **3 Indexers** + Dedicated SH  
کف سخت‌افزار: **16 physical cores / 32 GB / 32 vCPU** برای هر SH و Indexer (حداقل ES 8.5).

---

## 7) Splunk IT Service Intelligence (ITSI)

### 7.1 سخت‌افزار حداقل رسمی ITSI

> این مشخصات برای dedicated ITSI search head infrastructure است. اگر SH با Appهای دیگر share شود، بیش از 16 core / 12 GB لازم است.

| Machine role | Minimum CPU | Minimum RAM | Minimum vCPU |
|---|---|---|---|
| Search head | 16 cores لازم، **24+ توصیه‌شده**؛ یا 32 vCPU @ ≥ 2 GHz | 12 GB لازم، **16+ توصیه‌شده** | 32 vCPU لازم، 48+ توصیه‌شده |
| Indexer | 16 cores | 32 GB | 32 vCPU لازم، 48+ توصیه‌شده |

اگر CPU indexerها از حداقل بالاتر است، می‌توان Parallelization settings را برای بهبود indexer در use caseهای خاص فعال کرد.

**ارجاع:**  
[Plan your ITSI deployment → Hardware requirements](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

### 7.2 قواعد معماری مهم ITSI

| قاعده | جزئیات رسمی |
|---|---|
| ITSI و ES روی یک SH/SHC | **پشتیبانی نمی‌شود** |
| Dedicated SH | الزامی نیست، ولی برای مقیاس‌پذیری بهتر است |
| KPI > ~200 discrete | SHC پایدارتر است |
| Real-time | نباید روی SH یا Indexer tier مربوط به ITSI غیرفعال شود (notable grouping، anomaly، KPI alerting می‌شکنند) |
| SSL روی splunkd :8089 | الزامی |
| Java | 8.x–11.x یا 17 روی **search heads فقط** |
| KV store free space | حداقل **30 GB** آزاد در `$SPLUNK_HOME` |
| HEC | پورت 8088 برای local traffic |
| Indexer clustering | single-site و multisite پشتیبانی می‌شود؛ برای multisite: summary replication + SH روی `site0` |
| Forward SH data | بهترین عمل: forward همه internal data به indexerها |

**ارجاع:**  
[Plan your ITSI deployment](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment) — بخش‌های Search head considerations، Real-time، SSL، KV store، Compatibility

### 7.3 متغیرهای کلیدی Capacity Planning در ITSI

سه متغیر اصلی:
1. Average KPI run time
2. Frequency KPIs (1 / 5 / 15 minute)
3. Number of entities referenced **per KPI**

به‌علاوه: تعداد coreها، کل data indexed، concurrent users.

ثابت‌های مثال‌های رسمی Splunk:
- KPIهای 5-minute
- 12 cores per SH و Indexer
- محیط dedicated به ITSI
- Splunk Enterprise 6.6+
- **1 indexer per 100 GB indexed**
- «entity» = per-KPI measure در KV store (نه لزوماً total entities سیستم)

**ارجاع:**  
[Plan your ITSI deployment → ITSI capacity planning / Indexer and search head sizing examples](https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment)

### 7.4 جداول مثال رسمی ITSI

#### Example Set 1 — Average KPI runtime = 10s

**A) 0 entities/KPI ، 100 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 1 | 1 |
| 500 | 2 | 1 |
| 1,000 | 3 | 2 |

Rough plan رسمی: `~(Per 500 KPIs → 1+ SH, 1+ IDX) + 1 Indexer`

**B) 50 entities/KPI ، 500 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 5 | 1 |
| 500 | 5 | 2 |
| 1,000 | 5 | 3 |

Rough plan: `~(Per 333 KPIs → 1+ SH)`

#### Example Set 2 — Average KPI runtime = 5s

**A) 0 entities/KPI ، 100 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 1 | 1 |
| 500 | 1 | 1 |
| 1,000 | 2 | 2 |

Rough plan: `~(Per 950 KPIs → 1+ SH), (Per 730 KPIs → 1+ IDX)`

**B) 50 entities/KPI ، 500 GB/day**

| KPIs | Indexers | Search heads |
|---|---|---|
| 100 | 5 | 1 |
| 500 | 5 | 1 |
| 1,000 | 5 | 3 |

Rough plan: `~(Per 333 KPIs → 1+ SH)`

**نکته رسمی بسیار مهم:** تعداد KPI ≠ تعداد KPI searches. با KPI base searches، نیاز واقعی به search jobها بستگی دارد نه صرفاً شمار KPI.

### 7.5 روش سایزینگ Infra برای ITSI (گام‌به‌گام)

```text
1) KPI_count, KPI_freq, avg_runtime_sec, entities_per_KPI, D_gb_day را اندازه بگیرید
2) N_IDX_data ≈ ceil(D_gb_day / 100)   # قاعده مثال رسمی ITSI
3) با نزدیک‌ترین Example Set (5s یا 10s و 0 یا 50 entity) N_SH و N_IDX را بخوانید
4) N_IDX = max(N_IDX_data, N_IDX_from_examples)
5) سخت‌افزار هر نود ≥ جدول Hardware requirements ITSI (نه فقط minimum platform)
6) اگر Event Analytics/Episode Review دارید → SHC healthy و پایدار الزامی است
7) KV store sizing و limits.conf را طبق بخش KV store همان مستند بررسی کنید
```

**مثال:**  
500 KPI پنج‌دقیقه‌ای، runtime≈10s، 50 entity/KPI، 500 GB/day  
→ از Example Set 1-B: **5 Indexers + 2 Search Heads**  
سخت‌افزار: SH ≥ 16c/12GB (ترجیحاً 24c/16GB+)، Indexer ≥ 16c/32GB

### 7.6 Scale کردن SHC برای ITSI

| Factor | افزایش |
|---|---|
| Concurrent searches زیاد | CPU + RAM |
| Real-time زیاد / login همزمان | CPU |
| Correlation searches زیاد | RAM |

**ارجاع:** جدول *Search head scaling considerations for Splunk IT Service Intelligence* در همان مستند Plan

---

## 8) Splunk App for PCI Compliance

Reference hardware، PCI را به‌عنوان Premium App نام می‌برد که باید مستند خودش برای hardware/scaling بررسی شود.

از مستند ES:
- نصب PCI روی همان Search Head با ES (به‌عنوان CIM-compatible) مجاز دانسته شده است.
- بنابراین سایزینگ Infra عمدتاً از **ES + platform** پیروی می‌کند؛ PCI بار دانش/جستجوی اضافه روی همان SH می‌گذارد و باید در concurrency و RAM لحاظ شود.

**ارجاع:**  
[Reference hardware → Premium Splunk app requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)  
[ES Performance reference → Guidelines to optimize performance / CIM-compatible apps](https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/performance-reference-for-splunk-enterprise-security)

> برای اعداد سخت‌افزاری اختصاصی نسخه PCI خود، مستند Install همان نسخه PCI را در docs.splunk.com باز کنید (Deployment Planning / Hardware).

---

## 9) سایر نقش‌ها و Appهای مرتبط (خلاصه Infra)

| موضوع | منطق سایزینگ | ارجاع |
|---|---|---|
| **Heavy Forwarder (intermediate)** | از single-instance reference شروع؛ با منابع آزاد، multiple pipelines | Reference hardware → management components / pipeline sets |
| **License Manager / MC / Deployer / Cluster Manager** | شروع از single-instance specs؛ scale با اندازه محیط | Reference hardware → management components |
| **SOAR** | محصول جدا؛ سایزینگ از مستند SOAR | لینک محصول در docs Splunk (خارج از Capacity Manual) |
| **UBA** | معماری و سایزینگ جدا از ES SH | مستند UBA مربوطه |
| **Machine Learning Toolkit** | بار CPU/RAM روی SH؛ در concurrent search لحاظ شود | Dimensions → Splunk apps |
| **SmartStore-enabled Indexer** | CPU تقریباً مثل indexer عادی؛ تفاوت اصلی local cache + شبکه به object store؛ ترجیحاً 10Gbps | [SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements) |

### 9.1 نکته SmartStore مرتبط با Infra (نه فقط Storage)

- Indexerهای SmartStore با S3 باید روی AWS باشند؛ GCS→GCP؛ Azure Blob→Azure؛ S3-compatible on-prem→دیتاسنتر on-prem
- On-prem SmartStore: فقط Linux 64-bit یکسان روی همه ماشین‌ها
- نسخه: standalone ≥ 7.2؛ در cluster همه نودها ≥ 7.2
- برای ES روی SmartStore: cache محلی معادل **90 روز** indexed data (به‌جای 30 روز معمول)

**ارجاع:**  
[SmartStore system requirements](https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements)

---

## 10) الگوریتم کامل سایزینگ زیرساخت (چک‌لیست اجرایی)

### مرحله A — ورودی‌ها
```text
D          = daily ingest (GB/day) کل محیط
U          = concurrent / total users (طبق ردیف‌های جدول)
Apps       = {Core, ES, ITSI, PCI, ...}
KPI_profile = (count, freq, runtime, entities_per_kpi) اگر ITSI
Corr       = تعداد detections اگر ES
Cluster    = yes/no ؛ RF/SF ؛ single/multi-site
SmartStore = yes/no
```

### مرحله B — تعداد نود پایه (Platform)
```text
(N_SH_base, N_IDX_base) = Lookup(Summary of performance recommendations, D, U)
```
**ارجاع جدول:** Summary of performance recommendations

### مرحله C — اعمال Premium Apps
```text
if ES in Apps:
    (N_IDX_es, _) = Lookup(ES scaling table, D)
    N_IDX = max(N_IDX_base, N_IDX_es)
    SH must be dedicated ES SH/SHC
    prefer Mid-range or High-perf indexer specs

if ITSI in Apps:
    N_IDX_itsi = max(ceil(D/100), from ITSI examples)
    N_SH_itsi  = from ITSI examples
    N_IDX = max(N_IDX, N_IDX_itsi)
    N_SH  = max(N_SH_base, N_SH_itsi)
    hardware ≥ ITSI hardware table
    ES and ITSI must NOT share SH/SHC

if both ES and ITSI:
    separate search tiers (حداقل دو SH/SHC جدا)
    indexer tier can be shared if designed carefully (با PS)
```

### مرحله D — مشخصات هر نود
```text
Indexer SKU:
  Core only, light search     → Minimum (12c/12GB) یا Mid (24c/64GB)
  Premium / heavy search      → Mid (24c/64GB) یا High (48c/128GB)
  ES production               → ≥ 16 physical cores / 32 GB / 32 vCPU (ES 8.5)
  ITSI production             → ≥ 16 cores / 32 GB IDX (ITSI 5.0)

Search Head SKU:
  Platform min                → 16c/12GB
  ITSI                        → 16c/12GB min ؛ 24c/16GB+ recommended
  ES                          → ≥ 16 physical cores / 32 GB / 32 vCPU؛ با detections/concurrency scale کنید
```
### مرحله E — شبکه و مجازی‌سازی
```text
Cluster latency OK?  IDX≤100ms ، SHC≤200ms
VM reserved resources? no oversubscribe
IOPS tested across all indexers simultaneously?
Hyperthread → double vCPU vs physical guidance (ES virtualization note)
```

### مرحله F — خروجی سند Infra
```text
- Bill of Materials: تعداد و مشخصات SH / IDX / HF / Mgmt
- App placement matrix (کدام App روی کدام SH)
- Scaling triggers (مثلاً عبور از 300GB/day per min indexer، رشد KPI، رشد detections)
- ارجاع به سند Storage برای دیسک
```

---

## 11) فهرست ارجاعات رسمی استفاده‌شده در این سند

| # | عنوان مستند | بخش مرتبط | URL |
|---|---|---|---|
| 1 | Introduction to capacity planning | کلیات برنامه‌ریزی ظرفیت | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise |
| 2 | Dimensions of a Splunk Enterprise deployment | ابعاد اثرگذار | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/DimensionsofaSplunkEnterprisedeployment |
| 3 | Components of a Splunk Enterprise deployment | نقش‌ها و cluster | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/ComponentsofaSplunkEnterprisedeployment |
| 4 | Reference hardware | CPU/RAM/Storage type/latency/VM/Premium | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware |
| 5 | Summary of performance recommendations | جدول SH×IDX | https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations |
| 6 | ES 8.5 minimum specifications | کف SH/IDX (16c / 32 GB / 32 vCPU) | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/minimum-specifications-for-a-production-deployment |
| 7 | ES 8.5 scaling + performance reference | جدول detections، DMA، virtualization | https://help.splunk.com/en/splunk-enterprise-security-8/install/8.5/planning/considerations-for-scaling-deployments |
| 8 | Plan your ITSI deployment (5.0) | HW + KPI sizing examples | https://help.splunk.com/en/splunk-it-service-intelligence/splunk-it-service-intelligence/install-and-upgrade/5.0/planning/plan-your-itsi-deployment |
| 9 | SmartStore system requirements | HW/network/cache برای SmartStore | https://docs.splunk.com/Documentation/Splunk/latest/Indexer/SmartStoresystemrequirements |

---

## 12) Reminder رسمی Splunk

جداول و مثال‌ها **guideline** هستند. برای production بزرگ (به‌خصوص ES ≥ 1 TB/day یا محیط‌های پیچیده multi-app)، مستندات صراحتاً تماس با Splunk Sales / Professional Services / Field Architect را توصیه می‌کنند.

</div>
</div>
