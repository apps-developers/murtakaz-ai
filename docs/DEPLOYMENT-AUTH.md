# Authentication Deployment Guide

## Critical Environment Variables

For deployment to work properly, you **must** set these environment variables in your deployment platform (Coolify, Vercel, etc.):

### Required Variables

```bash
# Database Connection
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Better Auth Secret (CRITICAL)
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET="your-secure-random-string-here"

# Your Deployed Domain (CRITICAL)
BETTER_AUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_BETTER_AUTH_URL="https://yourdomain.com"
```

## Common Issues & Solutions

### Issue 1: Infinite Loading on Login
**Cause**: Missing or incorrect `BETTER_AUTH_URL` or `BETTER_AUTH_SECRET`

**Solution**: 
- Ensure `BETTER_AUTH_URL` matches your actual deployed domain
- Ensure `NEXT_PUBLIC_BETTER_AUTH_URL` matches `BETTER_AUTH_URL`
- Generate a proper secret: `openssl rand -base64 32`

### Issue 2: CORS Errors
**Cause**: Domain mismatch between client and server

**Solution**:
- Both `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` must be identical
- Must include the protocol (https:// or http://)
- Must NOT have trailing slashes

### Issue 3: Session Not Persisting
**Cause**: Cookie configuration issues in production

**Solution**:
- Ensure your deployment uses HTTPS (cookies are secure in production)
- Check that cookies are not blocked by browser settings
- Verify the domain is not using a subdomain with restrictive cookie policies

## Deployment Checklist

- [ ] Set `DATABASE_URL` to production database
- [ ] Generate and set `BETTER_AUTH_SECRET`
- [ ] Set `BETTER_AUTH_URL` to deployed domain
- [ ] Set `NEXT_PUBLIC_BETTER_AUTH_URL` to same domain
- [ ] Ensure domain uses HTTPS
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Create initial super admin user (see below)
- [ ] Test login flow after deployment

## Creating Super Admin User

After deployment, create a super admin user:

```bash
# SSH into your deployment or run locally with production DATABASE_URL
cd web
npx tsx ../prisma/create-super-admin.ts
```

Or use the setup admin API endpoint (one-time use recommended):

```bash
curl -X POST https://yourdomain.com/api/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure-password",
    "name": "Admin User"
  }'
```

## Debugging Production Auth Issues

### Enable Console Logs

The auth client now logs errors to the browser console. Check for:
- "Auth client error:" messages
- "Auth session error:" messages
- "Auth session loading timeout" warnings

### Check Network Tab

1. Open browser DevTools → Network tab
2. Look for requests to `/api/auth/session`
3. Check status codes:
   - 200 OK = session valid
   - 401 Unauthorized = no session
   - 500 Error = server configuration issue

### Verify Cookies

1. Open browser DevTools → Application → Cookies
2. Look for `better-auth.session_token`
3. Verify it has:
   - Secure flag (in production)
   - HttpOnly flag
   - Correct domain

## Configuration Files Changed

The following files were updated to fix auth issues:

- `web/src/lib/auth.ts` - Added baseURL, secret, trustedOrigins, and cookie config
- `web/src/lib/auth-client.ts` - Added fallback URL and error handling
- `web/src/middleware.ts` - Improved route handling with proper NextResponse
- `web/src/providers/auth-provider.tsx` - Added timeout and error handling
- `web/.env.example` - Updated with Better Auth variables

## Testing Auth Locally

Before deploying, test with production-like settings:

```bash
# In web/.env
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
NODE_ENV="production"

npm run build
npm run start
```

Then test:
1. Navigate to http://localhost:3000
2. Try logging in
3. Check browser console for errors
4. Verify session persists across page refreshes
