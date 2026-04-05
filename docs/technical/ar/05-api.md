# وثائق API

<div dir="rtl">

وثائق API لمنصة مرتكز KPI.

---

## نظرة عامة

**عنوان الأساسي (Base URL):**

```
https://api.murtakaz.com
```

**للتطوير المحلي:**

```
http://localhost:3000/api
```

**تنسيق الاستجابة:**

جميع الاستجابات بصيغة JSON.

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

---

## المصادقة

### JWT Token

يتم إرسال الرمز في ترويسة الطلب:

```http
Authorization: Bearer <token>
```

### Cookie-based (Current)

```http
Cookie: murtakaz_session=<session_id>
```

---

## نقاط النهاية (Endpoints)

### المصادقة

#### تسجيل الدخول

```http
POST /api/auth/login
Content-Type: application/json
```

**الطلب:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**الاستجابة الناجحة (200):**

```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "name": "أحمد محمد",
    "email": "user@example.com",
    "role": "MANAGER",
    "department": "dep_456"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**الاستجابة الفاشلة (401):**

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

#### تسجيل الخروج

```http
POST /api/auth/logout
```

**الاستجابة (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### الجلسة

#### الحصول على الجلسة الحالية

```http
GET /api/session
```

**الاستجابة (200):**

```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "name": "أحمد محمد",
    "email": "user@example.com",
    "role": "MANAGER"
  }
}
```

**الاستجابة عند عدم تسجيل الدخول (401):**

```json
{
  "success": false,
  "error": "Not authenticated"
}
```

---

### الكيانات (Entities)

#### قائمة الكيانات

```http
GET /api/entities?type=kpi&status=active&page=1&limit=20
```

**المعاملات (Query Parameters):**

| المعامل | النوع | الوصف |
|---------|-------|-------|
| `type` | string | نوع الكيان (kpi, project, initiative) |
| `status` | string | الحالة (active, planned, completed) |
| `owner` | string | معرّف المالك |
| `page` | integer | رقم الصفحة (default: 1) |
| `limit` | integer | عدد النتائج (default: 20, max: 100) |
| `search` | string | بحث نصي |

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ent_789",
        "title": "نسبة رضا العملاء",
        "titleAr": "نسبة رضا العملاء",
        "code": "kpi_satisfaction",
        "type": "kpi",
        "status": "active",
        "owner": { "id": "usr_123", "name": "أحمد محمد" },
        "target": 95,
        "current": 87,
        "unit": "%",
        "achievement": 91.5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

---

#### تفاصيل كيان

```http
GET /api/entities/:id
```

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "id": "ent_789",
    "title": "نسبة رضا العملاء",
    "titleAr": "نسبة رضا العملاء",
    "code": "kpi_satisfaction",
    "description": "مؤشر قياس رضا العملاء عن الخدمات",
    "type": "kpi",
    "status": "active",
    "owner": { "id": "usr_123", "name": "أحمد محمد" },
    "target": 95,
    "unit": "%",
    "direction": "INCREASE_IS_GOOD",
    "period": "MONTHLY",
    "formula": "get('survey_score') / get('total_responses') * 100",
    "variables": [
      { "code": "survey_score", "name": "مجموع الدرجات", "type": "NUMBER" }
    ],
    "values": [
      {
        "id": "val_001",
        "period": "2025-01",
        "value": 87,
        "status": "approved",
        "enteredBy": "usr_123",
        "enteredAt": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

#### إنشاء كيان

```http
POST /api/entities
Content-Type: application/json
```

**الطلب:**

```json
{
  "title": "مؤشر الأداء الجديد",
  "titleAr": "مؤشر الأداء الجديد",
  "code": "kpi_new",
  "type": "kpi",
  "ownerId": "usr_123",
  "target": 100,
  "unit": "%",
  "direction": "INCREASE_IS_GOOD",
  "period": "MONTHLY"
}
```

**الاستجابة (201):**

```json
{
  "success": true,
  "data": {
    "id": "ent_999",
    "title": "مؤشر الأداء الجديد",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

#### تحديث كيان

```http
PATCH /api/entities/:id
Content-Type: application/json
```

**الطلب:**

```json
{
  "title": "العنوان المحدث",
  "target": 95
}
```

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "id": "ent_789",
    "title": "العنوان المحدث",
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

---

#### حذف كيان

```http
DELETE /api/entities/:id
```

**الاستجابة (200):**

```json
{
  "success": true,
  "message": "Entity deleted successfully"
}
```

---

### قيم مؤشرات الأداء

#### إدخال قيمة

```http
POST /api/entities/:id/values
Content-Type: application/json
```

**الطلب:**

```json
{
  "period": "2025-01",
  "value": 87.5,
  "variables": {
    "survey_score": 875,
    "total_responses": 1000
  },
  "notes": "ملاحظات عن الفترة"
}
```

**الاستجابة (201):**

```json
{
  "success": true,
  "data": {
    "id": "val_002",
    "period": "2025-01",
    "value": 87.5,
    "calculatedValue": 87.5,
    "status": "draft",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

#### إرسال للاعتماد

```http
POST /api/values/:id/submit
```

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "id": "val_002",
    "status": "submitted",
    "submittedAt": "2025-01-15T11:00:00Z"
  }
}
```

---

#### اعتماد قيمة

```http
POST /api/values/:id/approve
Content-Type: application/json
```

**الطلب:**

```json
{
  "comment": "تم المراجعة والاعتماد"
}
```

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "id": "val_002",
    "status": "approved",
    "approvedBy": "usr_456",
    "approvedAt": "2025-01-15T14:00:00Z",
    "comment": "تم المراجعة والاعتماد"
  }
}
```

---

### لوحات المتابعة

#### الحصول على بيانات لوحة

```http
GET /api/dashboards/:type
```

**المعاملات:**

| المعامل | النوع | الوصف |
|---------|-------|-------|
| `from` | date | تاريخ البداية |
| `to` | date | تاريخ النهاية |
| `department` | string | تصفية حسب الإدارة |

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "kpis": {
      "total": 45,
      "onTrack": 35,
      "atRisk": 8,
      "offTrack": 2
    },
    "health": 85.5,
    "trends": [
      { "month": "2025-01", "value": 87 },
      { "month": "2024-12", "value": 84 },
      { "month": "2024-11", "value": 82 }
    ]
  }
}
```

---

### المستخدمين

#### قائمة المستخدمين

```http
GET /api/users?page=1&limit=20&department=dep_456
```

**الاستجابة (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "usr_123",
        "name": "أحمد محمد",
        "email": "ahmed@example.com",
        "role": "MANAGER",
        "department": { "id": "dep_456", "name": "الجودة" },
        "status": "active"
      }
    ],
    "pagination": { ... }
  }
}
```

---

## رموز الحالة (Status Codes)

| الرمز | المعنى | الوصف |
|-------|--------|-------|
| 200 | OK | الطلب ناجح |
| 201 | Created | تم الإنشاء بنجاح |
| 400 | Bad Request | طلب غير صالح |
| 401 | Unauthorized | غير مصرح |
| 403 | Forbidden | مرفوض (ليس لديك الصلاحية) |
| 404 | Not Found | المورد غير موجود |
| 422 | Unprocessable Entity | بيانات غير صالحة |
| 500 | Internal Server Error | خطأ في الخادم |

---

## معالجة الأخطاء

### صيغة الخطأ الموحدة

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### رموز أخطاء شائعة

| الرمز | الوصف | الحل |
|-------|-------|------|
| `UNAUTHORIZED` | غير مصرح | تسجيل الدخول |
| `FORBIDDEN` | مرفوض | التحقق من الصلاحيات |
| `NOT_FOUND` | غير موجود | التحقق من المعرّف |
| `VALIDATION_ERROR` | خطأ في التحقق | التحقق من البيانات |
| `DUPLICATE` | تكرار | قيمة موجودة مسبقاً |
| `RATE_LIMIT` | تجاوز الحد | الانتظار والمحاولة لاحقاً |

---

## الحدود والقيود

### Rate Limiting

- **القياسي**: 100 طلب/دقيقة
- **المصادق**: 1000 طلب/دقيقة
- **المسؤول**: 5000 طلب/دقيقة

### حجم الطلب

- **JSON**: 1 MB كحد أقصى
- **الملفات**: 10 MB كحد أقصى

---

## أمثلة بالـ cURL

### تسجيل الدخول

```bash
curl -X POST https://api.murtakaz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### الحصول على الكيانات

```bash
curl https://api.murtakaz.com/api/entities?type=kpi \
  -H "Authorization: Bearer $TOKEN"
```

### إنشاء كيان

```bash
curl -X POST https://api.murtakaz.com/api/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "مؤشر جديد",
    "code": "kpi_new",
    "type": "kpi"
  }'
```

</div>
