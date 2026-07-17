# برنامه‌ریزی ظرفیت Splunk

<div dir="rtl" lang="fa">

راهنمای رسمی **Capacity Planning** اسپلانک (زیرساخت + Storage) به‌صورت بستهٔ دوزبانه روی GitHub — همراه با ماشین‌حساب قابل‌حمل **SCPcalc**.

**طراحی: [محمد میراسدالهی](https://github.com/Mohammad-Mirasadollahi)** · **GitHub:** [Mohammad-Mirasadollahi/splunk-capacity-planning](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning)

**زبان:** [English](README.md) · **فارسی** (همین صفحه)  
**سایت زنده:** [هاب مستندات](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) · [ماشین‌حساب SCPcalc](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/?lang=fa)

نام پروژه از Capacity Planning Manual اسپلانک گرفته شده — [Introduction to capacity planning](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/IntroductiontocapacityplanningforSplunkEnterprise).

**مجوز:** [MIT](LICENSE) · **تغییرات:** [CHANGELOG.md](CHANGELOG.md)

> **توجه:** زبان پیش‌فرض و منبع حقیقت **انگلیسی** است (`docs/en/` و [`README.md`](README.md)). این صفحه نمای فارسی همان مخزن است.

## هاب مستندات

بستهٔ دوزبانهٔ Capacity Planning را در سایت طراحی‌شدهٔ GitHub Pages ببینید (نه فقط Markdown خام):

| | |
|---|---|
| **مستندات (فارسی)** | [mohammad-mirasadollahi.github.io/…/?lang=fa](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) |
| **Documentation (English)** | [mohammad-mirasadollahi.github.io/…/?lang=en](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=en) |
| **منبع Markdown** | [`docs/fa/`](docs/fa/) · [`docs/en/`](docs/en/) |

## ماشین‌حساب (SCPcalc)

باینری قابل‌حمل (Go): **CLI + UI وب محلی** با یک موتور — روی GitHub Pages هم با **WebAssembly** بدون سرور اجرا می‌شود.

برآورد فضای قابل‌جستجو / فیلدهای retention، پیشنهاد **N_SH / N_IDX** از کاربران همزمان × حجم روزانه × سرچ‌های همزمان × کلاسترینگ، لایه‌های سخت‌افزار و پیش‌نویس **`indexes.conf`**.

| | |
|---|---|
| **راهنمای کامل** | [`scpcalc/README.md`](scpcalc/README.md) |
| **UI استاتیک (WASM)** | [`calc/`](calc/) — در CI برای Pages در `/calc/` |
| طراحی | [`scpcalc/docs/`](scpcalc/docs/) |
| دانلود | GitHub **Releases** (تگ `scpcalc-v*`) — ساخت با [`./tools/release.sh`](tools/release.sh) |
| **GitHub Package** | کانتینر: [`ghcr.io/mohammad-mirasadollahi/scpcalc`](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/pkgs/container/scpcalc) |
| ساخت محلی | `cd scpcalc && make test && make wasm && make build` — [پیش‌نیازها](#پیشنیاز-build-و-release) |

### پیش‌نیاز Build و Release

جزئیات کامل: [`scpcalc/README.md` → Prerequisites](scpcalc/README.md#prerequisites).

| هدف | نصب کنید |
|---|---|
| **Build / تست** | **Go 1.22+**، **Python 3**، **Make**، **Bash** |
| **آرتیفکت محلی** (`make release`) | موارد بالا + **gzip** + **sha256sum** (یا `shasum`) |
| **انتشار Release + GHCR** (`./tools/release.sh`) | موارد بالا + **git** و دسترسی push به GitHub (باینری و پکیج را CI می‌سازد — روی لپ‌تاپ Docker لازم نیست) |
| **ایمیج Docker محلی** | **Docker** (+ Python/Make برای `make docker`) |

```bash
go version && python3 --version && make --version
```

```bash
# پکیج کانتینر (GitHub Packages / GHCR)
docker pull ghcr.io/mohammad-mirasadollahi/scpcalc:latest
docker run --rm -p 12345:12345 ghcr.io/mohammad-mirasadollahi/scpcalc:latest
```

## زبان

| | |
|---|---|
| **پیش‌فرض** | English — [`README.md`](README.md) + [`docs/en/`](docs/en/) |
| **فارسی** | این صفحه + [`docs/fa/`](docs/fa/) |
| هاب زنده | [Pages فارسی](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) · [Pages English](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=en) |

انگلیسی منبع حقیقت است؛ اسناد فارسی باید از نظر ساختار با انگلیسی همگام بمانند:

```bash
python3 tools/check_en_fa_sync.py
```

## شروع سریع (فارسی)

0. **[مراجع رسمی](docs/fa/00-References.md)**  
1. [سایزینگ زیرساخت](docs/fa/01-Infrastructure-Sizing.md)  
2. [سایزینگ Storage](docs/fa/02-Storage-Sizing.md)  
3. [رسانه دیسک، IOPS و توپولوژی Storage](docs/fa/03-Disk-Media-IOPS-and-Storage-Topology.md)  
4. [سایزینگ IOPS بر اساس معماری Storage](docs/fa/04-IOPS-Sizing-by-Storage-Architecture.md)  
5. [Bucketها، حجم Event و indexes.conf](docs/fa/05-Index-Buckets-Retention-and-indexes-conf.md)

نسخهٔ انگلیسی همین فهرست → [`README.md`](README.md).

## GitHub Pages

1. Settings → Pages → منبع: **GitHub Actions**  
2. پیش‌فرض سایت **English** است؛ برای فارسی روی **فارسی** کلیک کنید یا [`?lang=fa`](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/?lang=fa) را باز کنید.  
3. مستندات با `view.html` و ماشین‌حساب در **`/calc/`** منتشر می‌شوند.

## سوال، Feature و باگ

از **[GitHub Issues](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new/choose)** استفاده کنید و قالب مناسب را انتخاب کنید:

| نیاز شما | این Issue را باز کنید | چه چیزی بنویسید |
|---|---|---|
| **سوال / راهنمایی** (سایزینگ، کار SCPcalc، ابهام در مستندات) | [Question](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=question.yml) | چه کردید، لینک docs/UI، نتیجهٔ مورد انتظار |
| **درخواست قابلیت** (فلگ CLI، گام UI، فرمت خروجی، …) | [Feature request](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=feature_request.yml) | مشکل فعلی، ایده، فایده برای کاربر |
| **گزارش باگ** (عدد اشتباه، کرش، مشکل Pages/CLI/Docker) | [Bug report](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/issues/new?template=bug_report.yml) | نسخه (`scpcalc version`)، سیستم‌عامل، مراحل بازتولید، انتظار در برابر واقعیت؛ در صورت امکان **Export URL** یا JSON پلن |

قبل از ثبت Issue، [`CHANGELOG.md`](CHANGELOG.md) و [آخرین Release](https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning/releases/latest) را چک کنید — شاید همان مورد قبلاً رفع شده باشد. برای اسکرین‌شات UI: [SCPcalc روی Pages](https://mohammad-mirasadollahi.github.io/splunk-capacity-planning/calc/?lang=fa).

**امنیت / دادهٔ حساس:** رمز، لایسنس، یا لاگ شناسایی‌کنندهٔ مشتری را در Issue عمومی نگذارید؛ در صورت نیاز JSON پلن را redact کنید.

مشارکت کدی → [`CONTRIBUTING.md`](CONTRIBUTING.md).

## مشارکت

[`CONTRIBUTING.md`](CONTRIBUTING.md) را ببینید. PRهای مستند باید `check_en_fa_sync.py` را پاس کنند.

## منابع رسمی (خلاصه)

**فهرست کامل:** [docs/fa/00-References.md](docs/fa/00-References.md) · [`VERSION.md`](VERSION.md)

- [Reference hardware](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Referencehardware)
- [Estimate your storage requirements](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Estimateyourstoragerequirements)
- [Summary of performance recommendations](https://docs.splunk.com/Documentation/Splunk/latest/Capacity/Summaryofperformancerecommendations)

</div>
