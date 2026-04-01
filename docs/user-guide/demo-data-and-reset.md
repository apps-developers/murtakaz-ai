# Data Management & Reset

## Data Storage Architecture

The application uses a **PostgreSQL database** with Prisma ORM for all data persistence:

### Database Schema

Key entities stored in the database:

- **Organizations** — Multi-tenant organization data
- **Users** — User accounts with roles and manager relationships
- **Departments** — Organizational departments with managers
- **Entity Types** — Configurable entity types (Pillars, Objectives, KPIs, etc.)
- **Entities** — Organization-specific strategic entities
- **Entity Assignments** — User-to-entity responsibility mappings
- **Approval Requests** — Governance workflow requests
- **Notifications** — User notification queue
- **Feature Flags** — System-wide feature toggles

### File Storage

- User-uploaded files are stored in `web/public/uploads/`
- Organization logos and assets are served from `/uploads/`

## Backup & Recovery

### Database Backups

Backup files are stored in `data/backups/`:
- `backup_*.sql` — Full database dumps
- `*_snapshot_*.json` — JSON snapshots of seed data

### Creating a Backup

```bash
# From the web directory
npx prisma db seed --backup
```

Or use the backup script:
```bash
cd web && npx tsx prisma/backup-db.ts
```

## Reset Procedures

### Reset User Session

1. Click the user avatar in the sidebar
2. Select **Sign Out**
3. Or call `POST /api/session/logout`

### Database Reset (Development)

⚠️ **Warning**: This will delete all data!

```bash
cd web

# Reset database and apply migrations
npx prisma migrate reset

# Seed with initial data
npx prisma db seed
```

### Restore from Backup

```bash
# Restore from SQL backup
psql -d database_name -f data/backups/backup_YYYYMMDD_HHMMSS.sql
```

## Environment Configuration

### Required Environment Variables

See `web/.env.example`:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Session encryption key
- `NEXTAUTH_URL` — Application base URL

### Feature Flags Reset

Feature flags are stored in the database and can be reset via:
- `/<locale>/super-admin/settings` — Toggle individual features
- Database table: `FeatureFlag`

## Client-Side State

The following UI preferences are stored in browser `localStorage`:

- `theme` — Light/dark mode preference
- `locale` — Language preference
- `ai-chat-open` — AI Assistant panel state
- `sidebar-pinned` — Sidebar pinned state

⚠️ Clearing browser data will reset these preferences but will **not** affect server data.
