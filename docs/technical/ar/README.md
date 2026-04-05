# الدليل التقني — فهرس

<div dir="rtl">

## التوثيق التقني لمنصة مرتكز KPI

هذا الفهرس يحتوي على جميع الوثائق التقنية والتطويرية للمنصة.

---

## فهرس المحتويات

### الأساسيات

| # | المستند | الوصف |
|---|---------|-------|
| 01 | [نظرة عامة على التقنية المستخدمة](./01-tech-stack.md) | التقنيات والأدوار المستخدمة |
| 02 | [معمارية النظام](./02-architecture.md) | البنية المعمارية العالية المستوى |
| 03 | [دليل التطوير](./03-development.md) | إعداد البيئة والتطوير اليومي |

### النشر والتشغيل

| # | المستند | الوصف |
|---|---------|-------|
| 04 | [دليل النشر](./04-deployment.md) | خيارات النشر والإنتاج |
| 05 | [وثائق API](./05-api.md) | نقاط النهاية والاستخدام |
| 06 | [نموذج البيانات](./06-data-model.md) | مخطط قاعدة البيانات |
| 07 | [دليل التشغيل](./07-operations.md) | المراقبة والصيانة |
| 08 | [استكشاف الأخطاء](./08-troubleshooting.md) | حل المشكلات التقنية |

---

## البدء السريع للمطورين

### 1. استنساخ وإعداد

```bash
git clone https://github.com/your-org/murtakaz.git
cd murtakaz/web
npm install
cp .env.example .env.local
```

### 2. قاعدة البيانات

```bash
# باستخدام Docker
docker-compose up -d postgres

# أو محلياً
npx prisma migrate dev
npx prisma db seed
```

### 3. تشغيل التطوير

```bash
npm run dev
# افتح http://localhost:3000
```

---

## روابط سريعة

### للمطورين الجدد

1. اقرأ [دليل التطوير](./03-development.md)
2. افهم [معمارية النظام](./02-architecture.md)
3. راجع [نموذج البيانات](./06-data-model.md)

### لنشر الإنتاج

1. راجع [دليل النشر](./04-deployment.md)
2. اقرأ [دليل التشغيل](./07-operations.md)
3. تأكد من [استكشاف الأخطاء](./08-troubleshooting.md)

### لدمج API

1. راجع [وثائق API](./05-api.md)
2. اختبر في بيئة التطوير
3. راجع [نموذج البيانات](./06-data-model.md)

---

## المعايير والاتفاقيات

### البرمجة

- **TypeScript**: Strict mode
- **ESLint + Prettier**: Next.js defaults
- **Conventional Commits**: `feat:`, `fix:`, `docs:`

### البنية

```
src/
├── app/              # Next.js App Router
│   ├── [locale]/     # الصفحات المترجمة
│   └── api/          # API Routes
├── components/       # React Components
│   ├── ui/          # مكونات أساسية
│   └── features/    # مكونات الميزات
├── lib/             # أدوات مساعدة
├── providers/       # React Contexts
└── types/           # TypeScript Types
```

---

## المستودعات

| المستودع | الوصف | الرابط |
|----------|-------|--------|
| الرئيسي | كود التطبيق | [GitHub](https://github.com/your-org/murtakaz) |
| التوثيق | هذا المستند | [GitHub](https://github.com/your-org/murtakaz/tree/main/docs) |
| Docker | صور Docker | [Docker Hub](https://hub.docker.com/r/murtakaz/app) |

---

## الدعم التقني

### قنوات الاتصال

- **Slack**: `#dev-team`
- **Email**: `dev@murtakaz.com`
- **Issues**: [GitHub Issues](https://github.com/your-org/murtakaz/issues)

### ساعات العمل

- **الدعم العادي**: الأحد - الخميس، 9 ص - 6 م
- **طوارئ الإنتاج**: 24/7

---

## إصدارات النظام

| الإصدار | التاريخ | الحالة |
|---------|---------|--------|
| 1.2.0 | 2025-01-15 | مستقر |
| 1.1.0 | 2024-12-01 | مستقر |
| 1.0.0 | 2024-10-01 | مستقر |

---

## المساهمة

نرحب بالمساهمات! راجع:

1. [دليل التطوير](./03-development.md)
2. [معايير الكود](./03-development.md#best-practices)
3. [Contributing Guide](../../CONTRIBUTING.md)

---

**آخر تحديث**: 2025-01-15  
**الإصدار**: 1.0.0  
**الترخيص**: MIT

</div>
