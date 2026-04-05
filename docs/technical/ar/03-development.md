# دليل التطوير

<div dir="rtl">

دليل شامل للمطورين العاملين على منصة  المؤشرات KPI.

---

## المتطلبات الأساسية

### البرامج المطلوبة

| البرنامج | الإصدار المطلوب | الرابط |
|----------|-----------------|--------|
| Node.js | 22.x LTS | [nodejs.org](https://nodejs.org) |
| npm | 10.x | مرفق مع Node.js |
| Git | 2.x+ | [git-scm.com](https://git-scm.com) |
| PostgreSQL | 15+ | [postgresql.org](https://postgresql.org) |
| Docker | اختياري | [docker.com](https://docker.com) |

### التحقق من التثبيت

```bash
node --version    # v22.x.x
npm --version     # 10.x.x
git --version     # 2.x.x
```

---

## إعداد البيئة المحلية

### 1. استنساخ المستودع

```bash
git clone https://github.com/your-org/murtakaz.git
cd murtakaz
```

### 2. تثبيت التبعيات

```bash
cd web
npm install
```

### 3. إعداد المتغيرات البيئية

```bash
# نسخ ملف النموذج
cp .env.example .env.local

# تحرير الملف
nano .env.local
```

**محتوى .env.local:**

```env
# قاعدة البيانات
DATABASE_URL="postgresql://postgres:password@localhost:5432/murtakaz"

# المصادقة
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# التطوير
DEBUG="true"
```

### 4. إعداد قاعدة البيانات

**باستخدام Docker:**

```bash
# تشغيل PostgreSQL
docker-compose up -d postgres

# إنشاء قاعدة البيانات
docker-compose exec postgres createdb -U postgres murtakaz
```

**بدون Docker:**

```bash
# إنشاء قاعدة البيانات
createdb -U postgres murtakaz
```

### 5. تهيئة Prisma

```bash
# توليد عميل Prisma
npx prisma generate

# تشغيل الترحيلات
npx prisma migrate dev

# إضافة البيانات الأولية (اختياري)
npx prisma db seed
```

---

## تشغيل التطبيق

### وضع التطوير

```bash
npm run dev
```

يفتح المتصفح على: [http://localhost:3000](http://localhost:3000)

### وضع الإنتاج (محلي)

```bash
# بناء
npm run build

# تشغيل
npm start
```

---

## سكربتات npm

| السكربت | الوصف |
|---------|-------|
| `npm run dev` | وضع التطوير مع Turbopack |
| `npm run build` | بناء للإنتاج |
| `npm run start` | تشغيل الإنتاج |
| `npm run lint` | فحص ESLint |
| `npm run type-check` | فحص TypeScript |
| `npm run test` | تشغيل الاختبارات |
| `npm run prisma:generate` | توليد عميل Prisma |
| `npm run prisma:migrate` | تشغيل الترحيلات |
| `npm run prisma:studio` | فتح Prisma Studio |

---

## بنية المشروع

### المسارات الرئيسية

```
murtakaz/
├── docs/                       # التوثيق
│   ├── user-docs/ar/          # دليل المستخدم العربي
│   ├── technical/ar/          # التوثيق التقني العربي
│   └── ...
├── web/                        # تطبيق Next.js
│   ├── src/
│   │   ├── app/               # App Router
│   │   │   ├── [locale]/      # الصفحات المترجمة
│   │   │   └── api/           # API Routes
│   │   ├── components/        # مكونات React
│   │   │   ├── ui/           # مكونات أساسية
│   │   │   └── features/     # مكونات الميزات
│   │   ├── lib/              # الأدوات المساعدة
│   │   ├── providers/        # موفري React Context
│   │   └── types/            # أنواع TypeScript
│   ├── prisma/               # مخطط Prisma والترحيلات
│   ├── messages/             # ملفات الترجمة
│   └── public/               # الملفات العامة
└── docker-compose.yml        # إعداد Docker
```

### ملفات التكوين الرئيسية

| الملف | الوصف |
|-------|-------|
| `next.config.js` | إعدادات Next.js |
| `tailwind.config.js` | إعدادات Tailwind CSS |
| `tsconfig.json` | إعدادات TypeScript |
| `prisma/schema.prisma` | مخطط قاعدة البيانات |
| `.env.local` | المتغيرات البيئية (غير مرفوع) |

---

## التطوير اليومي

### سير العمل المعتاد

```bash
# 1. سحب آخر التغييرات
git pull origin main

# 2. تحديث التبعيات
npm install

# 3. تشغيل الترحيلات إن وجدت
npx prisma migrate dev

# 4. بدء التطوير
npm run dev
```

### إنشاء ميزة جديدة

```bash
# 1. إنشاء فرع جديد
git checkout -b feature/name

# 2. التطوير
# ... التعديلات ...

# 3. اختبار
npm run lint
npm run type-check
npm run test

# 4. الالتزام
git add .
git commit -m "feat: description"

# 5. الدفع
git push origin feature/name

# 6. إنشاء Pull Request
```

---

## أفضل الممارسات

### TypeScript

```typescript
// ✅ استخدم الأنواع الصريحة
function calculateKPI(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ❌ تجنب any
function badFunction(input: any): any {
  return input
}
```

### React Components

```typescript
// ✅ مكونات Server افتراضياً
async function Dashboard() {
  const data = await getData()
  return <DashboardView data={data} />
}

// ✅ مكونات Client فقط عند الضرورة
"use client"
function InteractiveButton() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Prisma

```typescript
// ✅ استخدام include/select بذكاء
const entity = await prisma.entity.findUnique({
  where: { id },
  include: {
    owner: true,
    values: { take: 5, orderBy: { date: 'desc' } }
  }
})

// ✅ معالجة الأخطاء
try {
  await prisma.entity.create({ data })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // معالجة خطأ معروف
  }
}
```

---

## التصحيح والتتبع

### Console Debugging

```typescript
// في Server Components
console.log('Server:', data)

// في Server Actions
"use server"
console.log('Action:', input)
```

### Chrome DevTools

1. افتح DevTools (F12)
2. انتقل إلى Console/Network
3. راقب طلبات API
4. تحقق من React Components في Components tab

---

## حل المشكلات الشائعة

### مشكلة: Port 3000 مشغول

```bash
# إيجاد العملية
lsof -i :3000

# إنهاء العملية
kill -9 <PID>

# أو استخدام port آخر
npm run dev -- --port 3001
```

### مشكلة: Prisma Client غير موجود

```bash
npx prisma generate
```

### مشكلة: ترحيلات معلقة

```bash
# إعادة تعيين قاعدة البيانات (للتطوير فقط)
npx prisma migrate reset
```

### مشكلة: Node modules تالف

```bash
# حذف وإعادة تثبيت
rm -rf node_modules package-lock.json
npm install
```

---

## الموارد الإضافية

### وثائق التقنيات

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### أدوات مفيدة

- **Prisma Studio**: `npx prisma studio`
- **React Developer Tools**: إضافة المتصفح
- **ESLint**: مدمج في VS Code
- **Prettier**: مدمج في VS Code

</div>
