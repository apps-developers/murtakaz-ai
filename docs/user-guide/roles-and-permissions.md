# Roles & Permissions

## Roles

The application defines these roles in the database (see `prisma/schema.prisma`):

- `SUPER_ADMIN` — System administrator with cross-organization access
- `ADMIN` — Organization administrator
- `EXECUTIVE` — Executive level user
- `MANAGER` — Department/team manager
- `EMPLOYEE` — Standard user (defined in schema but not currently used in UI flows)

## Access Rules (Implemented)

The Next.js middleware and server actions enforce the following rules:

### Public Routes
- Marketing pages: `/`, `/pricing`, `/faq`, `/about`, `/contact`, `/careers`, `/privacy`, `/terms`

### Authentication Required
- All non-marketing, non-API routes require a valid session
- Session is established via `POST /api/auth/login` with email/password

### Role-Based Restrictions

| Route | SUPER_ADMIN | ADMIN | EXECUTIVE | MANAGER |
|-------|-------------|-------|-----------|---------|
| `/super-admin/*` | ✓ Full access | ✗ | ✗ | ✗ |
| `/admin/*` | ✓ | ✓ Full access | ✗ | ✗ |
| `/users` | ✓ | ✓ Full CRUD | ✗ | ✗ |
| `/departments` | ✓ | ✓ Full CRUD | ✗ | ✗ |
| `/responsibilities` | ✓ (All entities/users) | ✓ (All entities/users) | ✓ (Own + subordinates) | ✓ (Own + subordinates) |
| `/approvals` | ✓ | ✓ | ✓ | ✓ |
| `/reports` | ✓ | ✓ | ✓ | ✓ |
| `/dashboards/*` | ✓ | ✓ | ✓ | ✓ |
| `/entities/*` | ✓ | ✓ | ✓ (Assigned only) | ✓ (Assigned only) |
| `/overview` | ✓ (Redirects to /super-admin) | ✓ | ✓ | ✓ |

## Manager Hierarchy

- Users can be assigned a **Manager** (except ADMIN and SUPER_ADMIN)
- Role ranking: ADMIN > EXECUTIVE > MANAGER
- Managers can only be assigned to users with equal or lower rank
- The Responsibilities page shows subordinates for non-admin users

## Feature Flags

Features can be enabled/disabled at the system level via `/super-admin/settings`:

- AI Features — AI Assistant chat panel
- Dashboards — Dashboard access
- Approvals Workflow — Approval request system
- Notifications — Notification system
- Audit Logs — Activity logging
- Diagrams — Visual diagram features
- Advanced Features — Experimental features
- File Attachments — File upload capabilities

## Data Scoping

- **SUPER_ADMIN** — Access to all organizations and data
- **ADMIN** — Access to their organization's data only
- **EXECUTIVE/MANAGER** — Access to assigned entities and subordinate data
- Entity assignments are managed via the Responsibilities page
