# Getting Started

This guide walks you through signing in, navigating the application, and understanding the basic layout.

---

## 1. Accessing the Application

Open your browser and navigate to the application URL provided by your organization. The URL path includes a locale prefix:

- **English**: `/en/...`
- **Arabic**: `/ar/...`

Visiting the root `/` automatically redirects you to `/en`.

---

## 2. Signing In

1. Go to `/<locale>/auth/login` (e.g., `/en/auth/login`).
2. Enter your **email address** and **password**.
3. Click **Sign In**.

After successful authentication, you are redirected to the **Overview** page (`/<locale>/overview`).

> **Note:** If you do not have credentials, contact your system administrator. Credentials are managed per organization and are not self-service.

### Forgot Password

Use the **Forgot Password** link on the login page to initiate a password reset via email.

---

## 3. Switching Language

The application fully supports **English** and **Arabic** (with proper RTL layout for Arabic).

- Change language by modifying the locale in the URL: replace `/en/` with `/ar/` or vice versa.
- Or use the language switcher control in the top navigation bar.

All labels, dates, and numbers adapt to the selected locale automatically.

---

## 4. Primary Navigation (Left Sidebar)

Once signed in, the left sidebar is your main navigation. The items visible depend on your role:

| Navigation Item | Description |
|----------------|-------------|
| **Overview** | Personalized executive summary and health snapshot |
| **Entities** | Browse KPIs and strategy items by type (dynamic, based on your org's configuration) |
| **KPIs** | KPI catalog with search and filter |
| **Pillars** | Strategic pillars / focus areas |
| **Objectives** | Organizational objectives |
| **Projects** | Project list and details |
| **Responsibilities** | Team assignments and ownership |
| **Risks** | Risk register |
| **Dashboards** | Role-based analytical dashboards |
| **Approvals** | KPI value approval queue |
| **Organization** | Organization structure and info |
| **Admin** | User management and settings (Admin only) |

---

## 5. Page Layout

Every page follows a consistent layout:

```
┌─────────────────────────────────────────────────┐
│  Left Sidebar (Navigation)  │  Page Content      │
│                             │  ┌──────────────┐  │
│  > Overview                 │  │ Page Header  │  │
│  > Entities                 │  │ (title + CTA)│  │
│  > KPIs                     │  └──────────────┘  │
│  > Dashboards               │  Main content area  │
│  > Approvals                │                    │
│  > Admin                    │                    │
└─────────────────────────────────────────────────┘
```

- **Page Header**: shows the page title, subtitle, and primary action buttons (e.g., "New Entity", "View Dashboards").
- **Cards**: data is displayed in cards with metrics, progress bars, and badges.
- **Tables**: lists of records with sortable columns and click-through to detail pages.

---

## 6. Signing Out

- Click your profile/avatar in the top navigation.
- Select **Sign Out**.

Your session is cleared and you are returned to the login page.

---

## 7. Profile Page

Navigate to `/<locale>/profile` to see:
- Your current role and organization
- Your access scope (what you can see and do)
- Preference settings (locale, theme)
