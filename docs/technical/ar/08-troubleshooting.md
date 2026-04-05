# استكشاف أخطاء تقنية

<div dir="rtl">

دليل استكشاف الأخطاء التقنية وحلها للمطورين ومسؤولي النظام.

---

## أخطاء الإنشاء (Build Errors)

### ❌ "Type error: Type 'X' is not assignable to type 'Y'"

**السبب:** عدم تطابق الأنواع في TypeScript.

**الحل:**

```typescript
// ✅ استخدام الأنواع الصحيحة
interface Props {
  id: string  // بدلاً من number
  value: number
}

// ✅ أو استخدام unknown مع التحقق
function processData(input: unknown) {
  if (typeof input === 'string') {
    return input.toUpperCase()
  }
}
```

---

### ❌ "Module not found"

**السبب:**
- التبعية غير مثبتة
- مسار الاستيراد غير صحيح
- حالة الأحرف في الملف (Linux حساس)

**الحل:**

```bash
# 1. التحقق من التثبيت
npm ls <package-name>

# 2. إعادة تثبيت
npm install <package-name>

# 3. التحقق من المسار
# ✅ ./components/Button (صحيح)
# ❌ ./Components/button (خاطئ في Linux)
```

---

### ❌ "Cannot find module '@/components/...'"

**السبب:** مشكلة في تهيئة alias في TypeScript.

**الحل:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## أخطاء قاعدة البيانات

### ❌ "Prisma Client: query engine not found"

**السبب:** لم يتم توليد عميل Prisma.

**الحل:**

```bash
npx prisma generate

# إذا استمرت المشكلة:
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

---

### ❌ "P1001: Can't reach database server"

**السبب:**
- PostgreSQL غير مشغل
- إعدادات الاتصال خاطئة
- جدار الحماية يمنع الاتصال

**الحل:**

```bash
# 1. التحقق من تشغيل PostgreSQL
sudo systemctl status postgresql

# 2. تشغيله إذا كان متوقفاً
sudo systemctl start postgresql

# 3. التحقق من الإعدادات
# في .env.local:
DATABASE_URL="postgresql://user:password@localhost:5432/murtakaz"

# 4. اختبار الاتصال
psql $DATABASE_URL -c "SELECT 1;"
```

---

### ❌ "P2002: Unique constraint failed"

**السبب:** محاولة إدراج قيمة مكررة في حقل فريد.

**الحل:**

```typescript
// ✅ التحقق قبل الإدراج
const existing = await prisma.user.findUnique({
  where: { email }
})

if (existing) {
  throw new Error('User already exists')
}

// ✅ أو استخدام upsert
await prisma.user.upsert({
  where: { email },
  update: data,
  create: data
})
```

---

### ❌ "P2025: Record not found"

**السبب:** محاولة تحديث/حذف سجل غير موجود.

**الحل:**

```typescript
// ✅ التحقق من الوجود
const entity = await prisma.entity.findUnique({
  where: { id }
})

if (!entity) {
  throw new Error('Entity not found')
}

// ✅ أو استخدام deleteMany
await prisma.entity.deleteMany({
  where: { id }
})
```

---

## أخطاء الخادم (Server Errors)

### ❌ "Error: connect ECONNREFUSED 127.0.0.1:3000"

**السبب:** خادم التطوير لا يعمل.

**الحل:**

```bash
# 1. التحقق من العملية
lsof -i :3000

# 2. إنهاء العملية إذا وجدت
kill -9 <PID>

# 3. إعادة التشغيل
npm run dev
```

---

### ❌ "API route not found"

**السبب:**
- الملف غير موجود
- الاسم غير صحيح
- الخادم لم يُعاد تشغيله

**الحل:**

```
# ✅ البنية الصحيحة
app/
  api/
    route-name/
      route.ts    # (صحيح)
      page.ts     # (خاطئ)
```

---

### ❌ "Server Actions must be async functions"

**السبب:** نسيان "use server" أو async.

**الحل:**

```typescript
// ✅ صحيح
"use server"

export async function createEntity(data: EntityInput) {
  // ...
}

// ❌ خاطئ
export function createEntity(data: EntityInput) {
  // ...
}
```

---

## أخطاء الأداء

### ❌ "API response time > 5s"

**السبب:**
- استعلامات بطيئة
- حلقات متكررة
- بيانات كبيرة بدون pagination

**الحل:**

```typescript
// ✅ استخدام select
await prisma.entity.findMany({
  select: { id: true, title: true },  // لا تجلب كل شيء
  take: 20,  // pagination
  skip: 0
})

// ✅ فهارس
CREATE INDEX idx_entity_status ON "Entity"(status);

// ✅ التخزين المؤقت
import { cache } from 'react'

const getEntities = cache(async () => {
  return prisma.entity.findMany()
})
```

---

### ❌ "Memory leak detected"

**السبب:**
- subscriptions غير مغلقة
- event listeners متراكمة
- closures تحتفظ بمراجع

**الحل:**

```typescript
// ✅ تنظيف useEffect
useEffect(() => {
  const subscription = subscribe()
  
  return () => {
    subscription.unsubscribe()  // تنظيف
  }
}, [])

// ✅ إزالة event listeners
useEffect(() => {
  const handler = () => {}
  window.addEventListener('resize', handler)
  
  return () => {
    window.removeEventListener('resize', handler)
  }
}, [])
```

---

## أخطاء المصادقة

### ❌ "JWT expired"

**السبب:** انتهت صلاحية الرمز.

**الحل:**

```typescript
// ✅ إعادة التوجيه للتسجيل الدخول
if (error.code === 'JWT_EXPIRED') {
  redirect('/auth/login')
}

// ✅ أو تحديث الرمز
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  })
  return response.json()
}
```

---

### ❌ "CSRF token missing"

**السبب:** غياب رمز CSRF.

**الحل:**

```typescript
// ✅ في Server Actions
"use server"

import { auth } from '@/auth'

export async function serverAction() {
  const session = await auth()
  if (!session) {
    throw new Error('Unauthorized')
  }
  // ...
}
```

---

## أخطاء Docker

### ❌ "Cannot connect to Docker daemon"

**السبب:** Docker غير مشغل.

**الحل:**

```bash
# Linux
sudo systemctl start docker

# macOS
open -a Docker

# Windows
# شغل Docker Desktop
```

---

### ❌ "Port already in use"

**السبب:** منفذ مشغول.

**الحل:**

```bash
# إيجاد وإنهاء العملية
lsof -i :5432
kill -9 <PID>

# أو استخدام منفذ مختلف
# في docker-compose.yml:
ports:
  - "5433:5432"  # 5433 خارج الحاوية
```

---

## أخطاء Git

### ❌ "Merge conflict"

**الحل:**

```bash
# 1. رؤية الملفات المتعارضة
git status

# 2. فتح الملفات وإصلاح التعارضات
# البحث عن: <<<<<<< HEAD

# 3. إضافة الملفات
git add .

# 4. إكمال الدمج
git commit -m "Resolved merge conflicts"
```

---

### ❌ "Permission denied (publickey)"

**السبب:** مفتاح SSH غير مضبوط.

**الحل:**

```bash
# 1. توليد مفتاح
ssh-keygen -t ed25519 -C "your@email.com"

# 2. إضافة إلى ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. نسخ المفتاح العام
pbcopy < ~/.ssh/id_ed25519.pub
# ثم أضفه إلى GitHub/GitLab
```

---

## أدوات التصحيح

### Chrome DevTools

**Network Tab:**
- مراقبة طلبات API
- فحص الأحجام والتوقيتات
- تكرار الطلبات

**Console Tab:**
- `console.log()` للقيم
- `console.table()` للمصفوفات
- `console.time()` للأداء

**React DevTools:**
- فحس شجرة المكونات
- تتبع props و state
- قياس الأداء

---

### VS Code Debugging

**.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## سجلات الأخطاء (Logs)

### مستويات السجلات

```typescript
import { logger } from '@/lib/logger'

logger.debug('Debug info')      // تطوير فقط
logger.info('User logged in')   // معلومات عامة
logger.warn('API slow')         // تحذير
logger.error('Database failed') // خطأ
```

### قراءة السجلات

```bash
# السجلات الحية
pm2 logs murtakaz

# آخر 100 سطر
pm2 logs murtakaz --lines 100

# تصفية الأخطاء
pm2 logs murtakaz --err
```

---

## الاتصال بالدعم

### معلومات مطلوبة

عند الإبلاغ عن خطأ، أرفق:

1. **خطوات الإنجاز:** كيفية إعادة إنتاج الخطأ
2. **السجلات:** نسخ ولصق من الـ console
3. **البيئة:**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - OS: macOS/Linux/Windows
4. **لقطة شاشة:** إن أمكن
5. **معرّف الخطأ:** correlation ID إن وجد

</div>
