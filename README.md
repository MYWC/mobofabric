<div align="center">

# 📱 Phone Store

**فروشگاه آنلاین گوشی موبایل — مینیمال، حرفه‌ای، دوزبانه**

[![Deploy](https://github.com/MYWC/mobofabric/actions/workflows/deploy.yml/badge.svg)](https://github.com/MYWC/mobofabric/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://MYWC.github.io/mobofabric/)

[🌐 مشاهده سایت](https://MYWC.github.io/mobofabric/) · [🐛 گزارش باگ](https://github.com/MYWC/mobofabric/issues) · [💡 پیشنهاد فیچر](https://github.com/MYWC/mobofabric/issues)

</div>

---

## ✨ ویژگی‌ها

- 🎨 **طراحی مینیمال** — الهام‌گرفته از Apple و Stripe
- 🌐 **دوزبانه** — فارسی / انگلیسی با پشتیبانی کامل RTL/LTR
- 🌓 **تم تاریک/روشن** — با حافظه‌ی کاربر
- 🛒 **سبد خرید کامل** — با localStorage و همگام‌سازی بین تب‌ها
- 🔍 **جستجوی زنده** — با Command Palette (Ctrl+K) و ناوبری کیبورد
- ⚡ **بدون build tool** — Vanilla JS + ES Modules
- 🗄️ **Supabase Backend** — PostgreSQL + Row Level Security
- 📱 **ریسپانسیو** — Mobile-first
- ♿ **دسترسی‌پذیری** — ARIA labels، keyboard nav، focus management
- 🚀 **CDN-ready** — GitHub Pages + GitHub Actions

---

## 🖼️ اسکرین‌شات

> _(به‌زودی)_

---

## 🏗️ معماری

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  ┌───────────────────────────────────────────────┐  │
│  │   HTML5 · CSS3 · Vanilla JS (ES Modules)      │  │
│  │                                               │  │
│  │   bootstrap.js ──► features/* ──► API call    │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │ HTTPS                     │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Supabase (BaaS)     │
              │  ┌─────────────────┐  │
              │  │  PostgreSQL     │  │
              │  │  + RLS policies │  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

### اصول طراحی

| اصل | توضیح |
|---|---|
| **Feature-based** | هر فیچر در پوشه‌ی خودش (js + css + lang) |
| **Event-driven** | فیچرها با event bus ارتباط دارند، نه import مستقیم |
| **Extend, never modify** | افزودن فیچر جدید = یک پوشه + یک خط در config |
| **i18n distributed** | هر فیچر ترجمه‌های خودش را دارد |
| **CSS auto-loader** | bootstrap خودش CSS فیچرها را بارگذاری می‌کند |

---

## 📁 ساختار پروژه

```
phone-store/
├── index.html                       # صفحه اصلی (SPA)
├── 404.html                         # صفحه 404 GitHub Pages
├── bootstrap.js                     # نقطه ورود
├── manifest.webmanifest             # PWA manifest
├── favicon.svg                      # آیکون
├── robots.txt                       # راهنمای کراولر
├── sitemap.xml                      # نقشه سایت
│
├── core/                            # هسته (یک‌بار ساخته شد)
│   ├── config.js                    # تنظیمات + فلگ فیچرها
│   ├── events.js                    # Event bus
│   ├── store.js                     # State management
│   ├── dom.js                       # ابزار DOM
│   ├── i18n.js                      # موتور دوزبانه
│   ├── api.js                       # لایه Supabase
│   └── router.js                    # Hash router
│
├── features/                        # هر فیچر مستقل
│   ├── products/                    # صفحه اصلی محصولات
│   ├── product-detail/              # جزئیات محصول
│   ├── cart/                        # سبد خرید
│   ├── brands/                      # برندها
│   ├── search/                      # جستجوی زنده
│   ├── about/                       # درباره ما
│   ├── contact/                     # تماس با ما
│   └── theme/                       # تم تاریک/روشن
│
├── shared/                          # کامپوننت‌های مشترک
│   ├── icons/icons.js               # همه SVGها
│   └── components/
│       ├── header/                  # هدر
│       ├── footer/                  # فوتر
│       ├── product-card/            # کارت محصول
│       ├── toast/                   # نوتیفیکیشن
│       └── skeleton/                # لودینگ placeholder
│
├── assets/
│   ├── styles/                      # reset, variables, base, utilities
│   └── images/                      # تصاویر
│
├── supabase/
│   ├── schema.sql                   # ساخت جداول + RLS
│   └── seed.sql                     # داده‌های نمونه
│
└── .github/workflows/deploy.yml     # استقرار خودکار
```

---

## 🚀 راه‌اندازی

### پیش‌نیازها

- Python 3 یا Node.js یا PHP (برای سرور محلی)
- حساب [Supabase](https://supabase.com) (رایگان)

### گام ۱ — کلون

```bash
git clone https://github.com/MYWC/mobofabric.git
cd mobofabric
```

### گام ۲ — راه‌اندازی Supabase

1. برو [supabase.com](https://supabase.com) → **New Project**
2. در **SQL Editor**:
   - محتوای `supabase/schema.sql` را اجرا کن
   - محتوای `supabase/seed.sql` را اجرا کن
3. در **Settings → API**:
   - `Project URL` را کپی کن
   - `anon / publishable key` را کپی کن

### گام ۳ — تنظیم `core/config.js`

```js
export const CONFIG = {
  supabase: {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'sb_publishable_YOUR_KEY',
  },
  // ...
};
```

### گام ۴ — اجرا

```bash
# یکی از این‌ها
python3 -m http.server 8000
npx serve
php -S localhost:8000
```

برو: `http://localhost:8000`

> ⚠️ **مهم:** چون از ES Modules استفاده می‌کنیم، **باید با سرور اجرا شود** — `file://` کار نمی‌کند.

---

## 🎛️ فلگ‌های فیچر

در `core/config.js` هر فیچر رو می‌تونی روشن/خاموش کنی:

```js
features: {
  products:      true,
  theme:         true,
  productDetail: true,
  cart:          true,
  brands:        true,
  search:        true,
  about:         true,
  contact:       true,
},
```

---

## 📊 وضعیت پروژه

| فاز | نام | وضعیت |
|:---:|---|:---:|
| 0 | بنیاد | ✅ |
| 1 | صفحه اصلی | ✅ |
| 2 | جزئیات محصول | ✅ |
| 3 | سبد خرید | ✅ |
| 4 | برندها | ✅ |
| 5 | جستجوی زنده | ✅ |
| 6 | About + Contact | ✅ |
| 7 | انتشار نهایی | ✅ |

---

## 🤝 مشارکت

1. Fork کن
2. یه branch بساز: `git checkout -b feature/amazing`
3. Commit کن: `git commit -m 'feat: add amazing feature'`
4. Push کن: `git push origin feature/amazing`
5. Pull Request باز کن

### الگوی Commit

- `feat:` فیچر جدید
- `fix:` باگ‌فیکس
- `style:` تغییر ظاهری
- `docs:` مستندات
- `refactor:` بازنویسی

---

## 📄 لایسنس

MIT © 2025 [MYWC](https://github.com/MYWC)

---

<div align="center">

**⭐ اگه این پروژه رو دوست داشتی، ستاره بده! ⭐**

</div>