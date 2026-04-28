# 🔧 Vercel Deployment Fix - Documentation

## Problem Identified

When accessing `https://pfa-five.vercel.app/family`, the application was showing "Route not found" error. This was a **Vercel routing configuration issue**.

### Root Cause
The Vercel configuration wasn't correctly distinguishing between:
- **Frontend routes** (React SPA) - should serve `/index.html`
- **API routes** - should route to the backend serverless function

This caused all non-API requests to be caught by the backend's 404 handler, displaying the "Route not found" JSON response instead of the frontend React app.

---

## Changes Made

### 1. Updated `vercel.json`

**Before:**
```json
{
    "version": 2,
    "rewrites": [
        { "source": "/api/(.*)", "destination": "/api/index.js" },
        { "source": "/(.*)", "destination": "/index.html" }
    ],
    "buildCommand": "npm run build",
    "outputDirectory": "dist"
}
```

**After:**
```json
{
    "version": 2,
    "buildCommand": "npm run build",
    "outputDirectory": "frontend/dist",
    "installCommand": "npm install",
    "env": {
        "NODE_ENV": "production"
    },
    "functions": {
        "api/index.js": {
            "maxDuration": 30,
            "memory": 1024,
            "runtime": "nodejs20.x"
        }
    },
    "routes": [
        {
            "src": "^/api/(.*)",
            "dest": "/api/index.js"
        },
        {
            "src": "^/health/?$",
            "dest": "/api/index.js"
        },
        {
            "src": "^/(?!api)(?!health)(?!assets)(?!favicon).*$",
            "dest": "/index.html",
            "status": 200
        },
        {
            "src": "^/assets/(.*)$",
            "dest": "/assets/$1"
        }
    ]
}
```

**Key Improvements:**
- ✅ Changed `outputDirectory` from `"dist"` to `"frontend/dist"` (correct build output location)
- ✅ Replaced `rewrites` with `routes` (Vercel v2 API)
- ✅ Added explicit `/api` route matching with regex
- ✅ Added explicit `/health` route for health checks
- ✅ Added catch-all route with negative lookahead to exclude API/static routes
- ✅ Set status 200 for SPA route rewrites (prevents Vercel from following redirects)
- ✅ Specified Node.js runtime version
- ✅ Added function configuration for the API serverless function

### 2. Updated `frontend/vite.config.js`

**Added:**
```javascript
server: {
    historyApiFallback: true
},
build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
        output: {
            manualChunks: undefined
        }
    }
}
```

This ensures proper client-side routing for React Router.

### 3. Simplified `package.json` build script

**Before:**
```json
"build": "cd frontend && npm install && npm run build && cd .. && npm install && rm -rf dist && cp -r frontend/dist dist"
```

**After:**
```json
"build": "cd frontend && npm install && npm run build && cd .."
```

Removed the unnecessary copying since `outputDirectory` now points directly to `frontend/dist`.

### 4. Created `.vercelignore`

```
# Excludes unnecessary files from deployment to reduce build time
node_modules/
frontend/node_modules/
backend/node_modules/
.env.development
test_db.mjs
CHAT_*.md
```

---

## How It Works Now

### Request Flow

```
User Request: https://pfa-five.vercel.app/family
                    ↓
            Vercel Routing Engine
                    ↓
        Does it match /api/(.*)?  → NO
                    ↓
        Does it match /health?    → NO
                    ↓
        Does it match static files? → NO
                    ↓
        ✓ Rewrite to /index.html (status 200)
                    ↓
        React Frontend Loads
                    ↓
        React Router handles /family route
                    ↓
        Renders FamilyAccessPage Component
```

### API Request Flow

```
User Request: https://pfa-five.vercel.app/api/family/my-family
                    ↓
            Vercel Routing Engine
                    ↓
        ✓ Matches /api/(.*) pattern
                    ↓
        Route to /api/index.js (Backend)
                    ↓
        Express Backend Processes Request
                    ↓
        Returns JSON Response
```

---

## Testing the Fix

### Test 1: Frontend Route
```
URL: https://pfa-five.vercel.app/family
Expected: FamilyAccessPage component loads
Status: ✅ Should work now
```

### Test 2: API Route
```
URL: https://pfa-five.vercel.app/api/auth/me (with auth token)
Expected: Returns user data JSON
Status: ✅ Should work (unchanged)
```

### Test 3: Non-existent Frontend Route
```
URL: https://pfa-five.vercel.app/invalid-page
Expected: React router shows 404 or redirects
Status: ✅ Should work now
```

### Test 4: Health Check
```
URL: https://pfa-five.vercel.app/health
Expected: Returns { "success": true, "message": "Server is running" }
Status: ✅ Should work
```

---

## Deployment Steps

To deploy the updated configuration:

1. **Commit changes:**
   ```bash
   git add vercel.json frontend/vite.config.js package.json .vercelignore
   git commit -m "fix: Update Vercel configuration for proper SPA routing"
   git push origin main
   ```

2. **Trigger Vercel rebuild:**
   - Vercel will automatically redeploy when you push to the main branch
   - Or manually trigger a redeploy from the Vercel dashboard

3. **Verify deployment:**
   - Wait for build to complete (check Vercel dashboard)
   - Visit https://pfa-five.vercel.app/family
   - Should now show the FamilyAccessPage instead of "Route not found"

---

## Files Modified

| File | Changes | Reason |
|------|---------|--------|
| `vercel.json` | Updated routes config, outputDirectory | Fix routing for SPA |
| `frontend/vite.config.js` | Added build config | Ensure proper SPA build |
| `package.json` | Simplified build script | Clean up unnecessary operations |
| `.vercelignore` | Created new file | Optimize deployment size/time |

---

## Common Issues & Solutions

### Issue: Still showing "Route not found"
**Solution:**
1. Clear Vercel cache: Settings → Deployments → Redeploy
2. Verify `outputDirectory` is `frontend/dist`
3. Check build logs for errors

### Issue: API requests failing
**Solution:**
1. Verify API base URL in `.env` file
2. Check backend is running on Vercel
3. Verify CORS is configured correctly

### Issue: Static assets returning 404
**Solution:**
1. Check that assets are in `frontend/dist/assets/`
2. Verify `.vercelignore` isn't excluding needed files
3. Clear Vercel cache and redeploy

### Issue: Build timeout
**Solution:**
1. Check `.vercelignore` to ensure unnecessary files are excluded
2. Verify frontend build completes locally
3. Increase function timeout in `vercel.json`

---

## Regex Pattern Explanation

The main catch-all route uses this pattern:
```
^/(?!api)(?!health)(?!assets)(?!favicon).*$
```

**Breakdown:**
- `^/` - Start from root
- `(?!api)` - Negative lookahead: NOT followed by "api"
- `(?!health)` - Negative lookahead: NOT followed by "health"
- `(?!assets)` - Negative lookahead: NOT followed by "assets"
- `(?!favicon)` - Negative lookahead: NOT followed by "favicon"
- `.*$` - Match everything else to the end

This pattern matches all routes EXCEPT those prefixed with api, health, assets, or favicon files.

---

## Next Steps

1. ✅ Deploy the updated files
2. ✅ Test all routes work correctly
3. ✅ Verify no console errors in browser DevTools
4. ✅ Test with different user scenarios (authenticated/unauthenticated)
5. ✅ Monitor Vercel logs for any errors
6. ✅ Share updated working link with team

---

## Documentation References

- [Vercel Routing Documentation](https://vercel.com/docs/edge-network/routing)
- [Vercel Functions Documentation](https://vercel.com/docs/concepts/functions/serverless-functions)
- [React Router SPA Configuration](https://reactrouter.com/start/library/routing)
- [Vite Build Configuration](https://vitejs.dev/config/)

---

## Questions?

If you encounter any issues:
1. Check the build logs in Vercel dashboard
2. Verify all files are committed and pushed
3. Clear cache and redeploy
4. Check this documentation for troubleshooting steps

