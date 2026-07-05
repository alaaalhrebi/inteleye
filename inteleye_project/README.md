# Inteleye - تحويل من Vite إلى Next.js

## نظرة عامة
تم تحويل الموقع من Vite + React إلى Next.js بنجاح. هذا المشروع يجمع بين:
- **صفحة الهبوط التسويقية** (من الموقع الثاني - Vite)
- **صفحات التطبيق الكاملة** (من الموقع الأول - Next.js)

## التعديلات الرئيسية

### 1. تحديث package.json
- تم استبدال Vite بـ Next.js
- تم إزالة react-router-dom (لا نحتاجه في Next.js)
- تم إزالة gh-pages (سنستخدم Vercel للنشر)

### 2. دمج ملفات CSS
- تم دمج `index.css` (من Vite) مع `globals.css` (من Next.js)
- تم الاحتفاظ بجميع الرسوميات والتأثيرات (animations)
- تم دعم كلا الخطين العربية والإنجليزية

### 3. إعادة هيكلة الملفات
```
src/
├── app/                    # صفحات Next.js App Router
│   ├── layout.tsx         # التخطيط الرئيسي
│   ├── page.tsx           # صفحة البداية (صفحة الهبوط التسويقية)
│   ├── globals.css        # الأنماط العامة
│   ├── pricing/           # صفحة الأسعار
│   ├── dashboard/         # لوحة التحكم
│   ├── login/             # صفحة تسجيل الدخول
│   ├── signup/            # صفحة إنشاء حساب
│   └── ...                # صفحات أخرى
├── components/            # المكونات المشتركة
├── lib/                   # مساعدات Supabase وغيرها
├── middleware.ts          # حماية المسارات
└── pages/                 # الصفحات الأصلية (للمرجعية)
```

### 4. إعدادات Next.js
- تم إنشاء `next.config.js` مع الإعدادات الأساسية
- تم تحديث `tsconfig.json` لإضافة alias `@/*` للمسارات
- تم إنشاء `vercel.json` لإعدادات النشر على Vercel

### 5. صفحة البداية
- تم استبدال صفحة البداية الأصلية (التي تعيد التوجيه إلى /pricing)
- بصفحة الهبوط التسويقية الكاملة من Vite
- تتضمن: Navbar, HeroSection, Stats, Features, AISection, Testimonials, Footer

## الخطوات التالية

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إضافة متغيرات البيئة
أنشئ ملف `.env.local` بالمحتوى التالي:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. تشغيل المشروع محلياً
```bash
npm run dev
```
ثم افتح [http://localhost:3000](http://localhost:3000)

### 4. بناء المشروع للإنتاج
```bash
npm run build
npm run start
```

## النشر على Vercel

### الطريقة الأولى: عبر GitHub
1. ادفع الكود إلى GitHub
2. اذهب إلى [vercel.com](https://vercel.com)
3. انقر على "New Project"
4. اختر مستودعك من GitHub
5. أضف متغيرات البيئة
6. انقر على "Deploy"

### الطريقة الثانية: عبر Vercel CLI
```bash
npm install -g vercel
vercel
```

## ملفات مهمة

| الملف | الوصف |
|------|-------|
| `src/app/page.tsx` | صفحة البداية (صفحة الهبوط التسويقية) |
| `src/app/layout.tsx` | التخطيط الرئيسي للتطبيق |
| `src/app/globals.css` | الأنماط العامة والرسوميات |
| `src/middleware.ts` | حماية المسارات والمصادقة |
| `next.config.js` | إعدادات Next.js |
| `vercel.json` | إعدادات النشر على Vercel |

## ملاحظات مهمة

1. **الصور**: تأكد من أن جميع الصور موجودة في مجلد `public/`
2. **Supabase**: تأكد من تثبيت `@supabase/ssr` و `@supabase/supabase-js`
3. **الخطوط**: تم دعم كلا من Inter و Tajawal
4. **الاتجاه**: تم تعيين `dir="rtl"` في HTML للدعم الكامل للعربية

## المشاكل المحتملة والحلول

### المشكلة: "Module not found"
**الحل**: تأكد من استخدام alias `@/` بدلاً من المسارات النسبية
```tsx
// ✓ صحيح
import Navbar from "@/components/Navbar";

// ✗ خطأ
import Navbar from "../components/Navbar";
```

### المشكلة: الصور لا تظهر
**الحل**: تأكد من أن الصور موجودة في مجلد `public/` واستخدم `/` في البداية
```tsx
// ✓ صحيح
<img src="/logo.png" alt="Logo" />

// ✗ خطأ
<img src="logo.png" alt="Logo" />
```

### المشكلة: مشاكل في المصادقة
**الحل**: تأكد من أن متغيرات البيئة صحيحة وأن `middleware.ts` موجود

## الدعم والمساعدة

للمزيد من المعلومات:
- [وثائق Next.js](https://nextjs.org/docs)
- [وثائق Vercel](https://vercel.com/docs)
- [وثائق Supabase](https://supabase.com/docs)
