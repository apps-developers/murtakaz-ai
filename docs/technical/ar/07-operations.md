# دليل التشغيل

<div dir="rtl">

دليل العمليات اليومية والصيانة لمنصة مرتكز KPI.

---

## المهام اليومية

### فحوصات الصباح (9:00 صباحاً)

```bash
# 1. فحص صحة النظام
curl https://api.murtakaz.com/api/health

# 2. مراجعة السجلات
# - تسجيل الدخول
# - أخطاء API
# - أداء البطيء

# 3. مراجعة الإشعارات
# - قيم KPI بانتظار الاعتماد
# - المخاطر المفتوحة
# - المشاريع المتأخرة
```

### فحوصات المساء (5:00 مساءً)

```bash
# 1. النسخ الاحتياطي اليومي
pg_dump murtakaz > backup_$(date +%Y%m%d).sql

# 2. مراجعة استخدام الموارد
# - CPU
# - الذاكرة
# - مساحة القرص

# 3. تسجيل مقاييس الأداء
```

---

## المراقبة

### لوحة المراقبة

| المقياس | الأداة | التنبيه عند |
|---------|--------|------------|
| توفر النظام | Uptime Robot | < 99.9% |
| أداء API | New Relic | > 500ms |
| أخطاء | Sentry | > 1% |
| قاعدة البيانات | Datadog | > 80% CPU |

### مقاييس رئيسية

**مؤشرات الأداء (KPIs) للنظام:**

```javascript
// uptime-check.js
const metrics = {
  // توفر النظام
  uptime: {
    target: 99.9,
    current: calculateUptime(),
    unit: '%'
  },
  
  // أداء API
  apiLatency: {
    p50: '< 200ms',
    p95: '< 500ms',
    p99: '< 1000ms'
  },
  
  // معدل الأخطاء
  errorRate: {
    target: '< 0.1%',
    current: calculateErrorRate(),
    unit: '%'
  },
  
  // قاعدة البيانات
  dbPerformance: {
    queryTime: '< 100ms',
    connections: '< 80%',
    slowQueries: '< 5/min'
  }
}
```

---

## النسخ الاحتياطي

### الاستراتيجية 3-2-1

- **3** نسخ من البيانات
- **2** وسائط تخزين مختلفة
- **1** نسخة خارج الموقع

### جدول النسخ الاحتياطي

| النوع | التكرار | الاحتفاظ | الموقع |
|-------|---------|----------|--------|
| قاعدة البيانات | يومي | 30 يوم | S3 |
| ملفات التطبيق | أسبوعي | 12 أسبوع | S3 |
| إعدادات النظام | عند التغيير | 10 نسخ | Git |

### سكربت النسخ الاحتياطي

```bash
#!/bin/bash
# backup.sh

# إعدادات
DB_NAME="murtakaz"
BACKUP_DIR="/backups"
S3_BUCKET="s3://murtakaz-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# نسخ قاعدة البيانات
echo "جارٍ نسخ قاعدة البيانات..."
pg_dump -Fc $DB_NAME > "$BACKUP_DIR/db_$DATE.dump"

# ضغط
echo "جارٍ الضغط..."
gzip "$BACKUP_DIR/db_$DATE.dump"

# نقل إلى S3
echo "جارٍ الرفع إلى S3..."
aws s3 cp "$BACKUP_DIR/db_$DATE.dump.gz" $S3_BUCKET/database/

# حذف النسخ المحلية القديمة
find $BACKUP_DIR -name "db_*.dump.gz" -mtime +7 -delete

# إعلام Slack (اختياري)
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ Backup completed: '$DATE'"}' \
  $SLACK_WEBHOOK_URL

echo "تم!"
```

### Cron Job

```bash
# فتح crontab
crontab -e

# إضافة مهام
# النسخ الاحتياطي اليومي عند 2 صباحاً
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1

# تنظيف السجلات القديمة
0 3 * * 0 /path/to/cleanup-logs.sh
```

---

## الصيانة المجدولة

### الصيانة الأسبوعية

**يوم الأحد (صيانة خفيفة):**

- [ ] مراجعة سجلات الأخطاء
- [ ] تنظيف الجلسات القديمة
- [ ] تحديث فهارس البحث
- [ ] مراجعة مقاييس الأداء

### الصيانة الشهرية

**الأسبوع الأول:**

- [ ] تحليل أداء الاستعلامات
- [ ] تحديث الإحصائيات
- [ ] مراجعة أمان النظام
- [ ] تحديث التبعيات (dependencies)

**الأسبوع الثالث:**

- [ ] اختبار استعادة النسخ الاحتياطي
- [ ] مراجعة سعة التخزين
- [ ] تنظيف البيانات القديمة
- [ ] تحديث الوثائق

### الصيانة الربع سنوية

- [ ] مراجعة شامل لأمان النظام
- [ ] تحديث إستراتيجية النسخ الاحتياطي
- [ ] مراجعة التراخيص والاشتراكات
- [ ] اختبار خطة الطوارئ

---

## إدارة المستخدمين

### إنشاء مستخدم جديد

```sql
-- عبر قاعدة البيانات
INSERT INTO "User" (id, email, name, role, organizationId, status)
VALUES (
  gen_random_uuid(),
  'new.user@company.com',
  'اسم المستخدم',
  'MANAGER',
  'org_123',
  'ACTIVE'
);
```

### تعطيل مستخدم

```sql
UPDATE "User" 
SET status = 'INACTIVE', 
    updatedAt = NOW()
WHERE id = 'usr_123';
```

### إعادة تعيين كلمة المرور

```bash
# عبر CLI
npm run reset-password -- --user=usr_123
```

---

## إدارة الكيانات

### إنشاء كيان بالجملة

```bash
# استيراد من CSV
npm run import-entities -- --file=entities.csv --type=kpi
```

### حذف كيان (Soft Delete)

```sql
-- الحذف الناعم
UPDATE "Entity"
SET deletedAt = NOW()
WHERE id = 'ent_123';

-- الاستعادة
UPDATE "Entity"
SET deletedAt = NULL
WHERE id = 'ent_123';

-- الحذف النهائي (احذر!)
DELETE FROM "Entity" WHERE id = 'ent_123';
```

---

## الأداء

### تحليل استعلامات بطيئة

```sql
-- تفعيل pg_stat_statements أولاً
-- في postgresql.conf: shared_preload_libraries = 'pg_stat_statements'

-- الاستعلامات البطيئة
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### تحسين الفهارس

```sql
-- إيجاد الاستعلامات بدون فهارس
SELECT 
  schemaname,
  tablename,
  attname as column,
  n_tup_read,
  n_tup_fetch
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_tup_read DESC;

-- إضافة فهرس جديد
CREATE INDEX CONCURRENTLY idx_entity_owner 
ON "Entity"(ownerId);
```

---

## الأمان

### تدوير مفاتيح API

```bash
# إنشاء مفتاح جديد
npm run rotate-api-key -- --env=production

# إبطال المفتاح القديم (بعد 24 ساعة)
npm run revoke-api-key -- --key=old_key_id
```

### مراجعة الوصول

```sql
-- المستخدمين النشطين
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.lastLoginAt,
  COUNT(ea.id) as assignedEntities
FROM "User" u
LEFT JOIN "EntityAssignment" ea ON u.id = ea.userId
WHERE u.status = 'ACTIVE'
GROUP BY u.id;

-- محاولات تسجيل دخول فاشلة
SELECT 
  email,
  COUNT(*) as failedAttempts,
  MAX(createdAt) as lastAttempt
FROM "LoginAttempt"
WHERE success = false
  AND createdAt > NOW() - INTERVAL '24 hours'
GROUP BY email
HAVING COUNT(*) > 5;
```

---

## الترقيات

### ترقية الإصدار

```bash
# 1. النسخ الاحتياطي
./backup.sh

# 2. سحب الإصدار الجديد
git fetch origin
git checkout v1.2.0

# 3. تحديث التبعيات
npm ci

# 4. ترحيل قاعدة البيانات
npx prisma migrate deploy

# 5. بناء
npm run build

# 6. إعادة التشغيل
pm2 restart murtakaz

# 7. فحص الصحة
curl https://api.murtakaz.com/api/health
```

### ترقية PostgreSQL

```bash
# 1. نسخ احتياطي كامل
pg_dumpall > full_backup.sql

# 2. إيقاف التطبيق
pm2 stop murtakaz

# 3. ترقية PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-16

# 4. اختبار
sudo -u postgres psql -c "SELECT version();"

# 5. إعادة التشغيل
pm2 start murtakaz
```

---

## سجل التغييرات

### نموذج Change Log

```markdown
## [1.2.0] - 2025-01-15

### Added
- ميزة التقارير المخصصة
- دعم صيغ Excel للتصدير

### Changed
- تحسين أداء لوحات المتابعة

### Fixed
- إصلاح خطأ في حساب المتوسطات المرجحة

### Security
- تحديث NextAuth.js لإصلاح CVE-2025-XXXX
```

---

## التواصل

### قنوات الإعلام

| الحدث | القناة | الوقت |
|-------|--------|-------|
| انقطاع النظام | Slack #alerts | فوري |
| انتهاء النسخ الاحتياطي | Slack #ops | فوري |
| صيانة مجدولة | Email | 24 ساعة مسبقاً |
| تقرير أسبوعي | Email | كل أحد |

### جهات الاتصال

| الدور | الاسم | البريد | الهاتف |
|-------|-------|--------|--------|
| مسؤول النظام | - | admin@company.com | - |
| الدعم الفني | - | support@murtakaz.com | - |
| الطوارئ | - | emergency@company.com | - |

</div>
