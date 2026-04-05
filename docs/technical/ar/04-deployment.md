# دليل النشر

<div dir="rtl">

دليل شامل لنشر منصة  المؤشرات KPI في بيئات الإنتاج والتشغيل.

---

## خيارات النشر

### 1. Nixpacks / Coolify (الموصى به)

يحتوي المستودع على ملف `nixpacks.toml` مع خط أنابيب نشر جاهز.

**المميزات:**
- بناء تلقائي عند الدفع
- إدارة المتغيرات البيئية
- HTTPS تلقائي
- CDN مدمج

**الخطوات:**

```bash
# 1. ربط المستودع بـ Coolify
# عبر واجهة Coolify

# 2. إعداد المتغيرات البيئية
# في إعدادات التطبيق بـ Coolify

# 3. النشر يتم تلقائياً
```

**ملف nixpacks.toml:**

```toml
[phases.build]
cmds = [
  "cd web && npm ci",
  "cd web && npm run build"
]

[phases.setup]
nixPkgs = ['nodejs_22', 'npm-9_x']

[start]
cmd = "cd web && npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"
```

---

### 2. Docker

**بناء الصورة:**

```bash
# بناء صورة Docker
docker build -t murtakaz:latest .

# تشغيل الحاوية
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="..." \
  murtakaz:latest
```

**ملف Dockerfile:**

```dockerfile
# مرحلة البناء
FROM node:22-alpine AS builder
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

# مرحلة الإنتاج
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### 3. VPS (Virtual Private Server)

**الخطوات:**

```bash
# 1. الاتصال بالخادم
ssh user@server-ip

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 4. استنساخ المستودع
git clone https://github.com/your-org/murtakaz.git
cd murtakaz/web

# 5. تثبيت التبعيات
npm ci

# 6. بناء التطبيق
npm run build

# 7. إعداد PM2 للتشغيل المستمر
npm install -g pm2
pm2 start npm --name "murtakaz" -- start
pm2 save
pm2 startup
```

---

## المتغيرات البيئية للإنتاج

### مطلوبة

| المتغير | الوصف | مثال |
|---------|-------|------|
| `DATABASE_URL` | سلسلة اتصال PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | مفتاح تشفير الجلسات | `random-string-32-chars-min` |
| `NEXTAUTH_URL` | عنوان التطبيق | `https://app.murtakaz.com` |

### اختيارية

| المتغير | الوصف | مثال |
|---------|-------|------|
| `PORT` | منفذ التطبيق | `3000` |
| `REDIS_URL` | للتخزين المؤقت | `redis://localhost:6379` |
| `AZURE_AD_CLIENT_ID` | Azure AD | `...` |
| `AZURE_AD_CLIENT_SECRET` | Azure AD | `...` |
| `AZURE_AD_TENANT_ID` | Azure AD | `...` |

---

## فحوصات ما قبل النشر

### 1. اختبارات الوحدة

```bash
npm run test
```

### 2. فحص TypeScript

```bash
npm run type-check
```

### 3. فحص ESLint

```bash
npm run lint
```

### 4. فحص الأمان

```bash
npm audit
```

### 5. قائمة المراجعة النهائية

- [ ] جميع المتغيرات البيئية مضبوطة
- [ ] قاعدة البيانات متصلة
- [ ] الترحيلات محدثة
- [ ] HTTPS مُفعل
- [ ] النسخ الاحتياطية مُهيأة
- [ ] المراقبة مُفعلة

---

## إعداد SSL/TLS

### استخدام Let's Encrypt (مع Nginx)

```nginx
# /etc/nginx/sites-available/murtakaz
server {
    listen 80;
    server_name app.murtakaz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.murtakaz.com;

    ssl_certificate /etc/letsencrypt/live/app.murtakaz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.murtakaz.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**الحصول على الشهادة:**

```bash
sudo certbot --nginx -d app.murtakaz.com
```

---

## النسخ الاحتياطي

### قاعدة البيانات

```bash
# نسخ احتياطي يومي
pg_dump -h localhost -U postgres murtakaz > backup_$(date +%Y%m%d).sql

# ضغط النسخة الاحتياطية
gzip backup_$(date +%Y%m%d).sql

# نقل إلى S3 (اختياري)
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://murtakaz-backups/
```

### ت automate مع Cron

```bash
# تحرير crontab
crontab -e

# إضافة مهمة يومية عند 2 صباحاً
0 2 * * * /path/to/backup-script.sh
```

---

## المراقبة

### الصحة (Health Checks)

```bash
# نقطة نهاية الصحة
GET /api/health

# الرد المتوقع
{ "status": "ok", "timestamp": "2025-01-15T10:30:00Z" }
```

### المقاييس الأساسية

| المقياس | الهدف | التنبيه عند |
|---------|-------|------------|
| استجابة API | < 200ms | > 500ms |
| استخدام CPU | < 70% | > 80% |
| استخدام الذاكرة | < 80% | > 90% |
| مساحة القرص | < 80% | > 85% |

### أدوات المراقبة

- **Uptime Robot**: مراقبة توفر الخدمة
- **New Relic**: APM وتتبع الأداء
- **Logtail**: تجميع السجلات

---

## التراجع (Rollback)

### عند فشل النشر

```bash
# 1. إيقاف التطبيق الحالي
pm2 stop murtakaz

# 2. استعادة النسخة السابقة
git checkout previous-tag

# 3. إعادة البناء
npm ci && npm run build

# 4. إعادة التشغيل
pm2 start murtakaz

# 5. استعادة قاعدة البيانات (إن لزم)
psql -h localhost -U postgres murtakaz < backup_previous.sql
```

---

## حل مشاكل النشر

### مشكلة: التطبيق لا يبدأ

```bash
# فحص السجلات
pm2 logs murtakaz

# التحقق من المتغيرات البيئية
echo $DATABASE_URL
echo $NEXTAUTH_SECRET

# فحص المنافذ
netstat -tlnp | grep 3000
```

### مشكلة: أداء بطيء

```bash
# مراقبة الموارد
htop

# فحص الاستعلامات البطيئة في PostgreSQL
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### مشكلة: أخطاء 502 Bad Gateway

- التحقق من تشغيل التطبيق: `pm2 status`
- التحقق من المنفذ: `curl localhost:3000`
- فحص Nginx: `sudo nginx -t`

---

## بيئات متعددة

### التطوير (Development)

```env
NODE_ENV=development
DEBUG=true
NEXTAUTH_URL=http://localhost:3000
```

### التجريبي (Staging)

```env
NODE_ENV=staging
NEXTAUTH_URL=https://staging.murtakaz.com
```

### الإنتاج (Production)

```env
NODE_ENV=production
NEXTAUTH_URL=https://app.murtakaz.com
```

---

## خطط الطوارئ

### فقدان قاعدة البيانات

1. استعادة من النسخة الاحتياطية الأخيرة
2. التحقق من سلامة البيانات
3. إعلام المستخدمين إن لزم

### تعطل الخادم

1. التبديل إلى خادم احتياطي (إن وجد)
2. استعادة من النسخة الاحتياطية
3. إعادة تكوين DNS إن لزم

</div>
