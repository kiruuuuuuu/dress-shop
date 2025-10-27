# 🚀 Deployment & Troubleshooting Guide

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Deployment](#database-deployment)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Environment Variables](#environment-variables)
6. [Security Checklist](#security-checklist)
7. [Common Issues & Fixes](#common-issues--fixes)
8. [Known Bugs & Workarounds](#known-bugs--workarounds)

---

## Pre-Deployment Checklist

- [ ] PostgreSQL database ready (local or cloud)
- [ ] Razorpay production account activated
- [ ] GitHub repository created
- [ ] All environment variables documented
- [ ] Application tested locally
- [ ] Admin user created in production database
- [ ] SSL certificate ready for production

---

## Database Deployment

### Option 1: Render PostgreSQL (Free Tier Available)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **PostgreSQL**
3. Configure:
   - Name: `dress-shop-db`
   - Database: `dress_shop`
   - Region: Choose closest to users
4. Save connection details:
   - Internal URL (for backend)
   - External URL (for local testing)

5. Initialize database:
```bash
# On your local machine, connect to Render database
psql "<external-database-url>"

# Or update server/.env with production DB URL and run:
cd server
npm run db:init
npm run db:seed  # Optional: for initial data
```

### Option 2: Railway PostgreSQL

1. Go to [Railway](https://railway.app/)
2. Create project → **PostgreSQL**
3. Copy connection string
4. Use same init process as above

### Option 3: AWS RDS / DigitalOcean

1. Create PostgreSQL instance
2. Configure security groups
3. Note connection details
4. Initialize using same process

---

## Backend Deployment

### Option 1: Render (Recommended)

**1. Create Web Service**
1. Go to Render Dashboard
2. **New** → **Web Service**
3. Connect GitHub repository
4. Configure:
   - Name: `dress-shop-api`
   - Root Directory: `server`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free (or paid for production)

**2. Environment Variables**
Add in Environment section:
```env
PORT=5000
NODE_ENV=production

DB_HOST=<from-render-postgres>
DB_PORT=5432
DB_NAME=dress_shop
DB_USER=<from-render-postgres>
DB_PASSWORD=<from-render-postgres>

JWT_SECRET=<generate-strong-64-char-random-string>
JWT_EXPIRE=7d

RAZORPAY_KEY_ID=<production-key-id>
RAZORPAY_KEY_SECRET=<production-key-secret>

CLIENT_URL=https://your-frontend-url.vercel.app
```

**3. Deploy**
- Click **Create Web Service**
- Note your API URL: `https://dress-shop-api.onrender.com`

### Option 2: Railway

1. Create project from GitHub
2. Select `server` directory
3. Add environment variables
4. Auto-deploys on git push

### Option 3: Heroku

```bash
cd server
heroku create dress-shop-api
heroku addons:create heroku-postgresql:mini
heroku config:set JWT_SECRET=your_secret
heroku config:set RAZORPAY_KEY_ID=your_key
git push heroku main
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended for Next.js)

**1. Connect Repository**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. **Add New** → **Project**
3. Import GitHub repository

**2. Configure**
- Framework: **Next.js** (auto-detected)
- Root Directory: `client`
- Build Command: `npm run build` (auto)
- Output Directory: `.next` (auto)

**3. Environment Variables**
```env
NEXT_PUBLIC_API_URL=https://dress-shop-api.onrender.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=<production-key-id>
```

**4. Deploy**
- Click Deploy
- Your site: `https://dress-shop.vercel.app`

**5. Update Backend CORS**
- Go to Render backend
- Update `CLIENT_URL` to your Vercel URL
- Redeploy backend

### Option 2: Netlify

1. Import from Git
2. Base: `client`
3. Build: `npm run build`
4. Publish: `.next`
5. Add environment variables
6. Deploy

---

## Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database - Get from your database provider
DB_HOST=dpg-xxxxx.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=dress_shop
DB_USER=dress_shop_user
DB_PASSWORD=<strong-password>

# JWT - Generate with: openssl rand -base64 64
JWT_SECRET=<64-char-random-string>
JWT_EXPIRE=7d

# Razorpay Production Keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# Frontend URL - Your Vercel/Netlify URL
CLIENT_URL=https://dress-shop.vercel.app
```

### Frontend (.env.local)

```env
# Backend API URL - Your Render/Railway URL
NEXT_PUBLIC_API_URL=https://dress-shop-api.onrender.com

# Razorpay PUBLIC key (same as backend)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
```

---

## Security Checklist

Before going live:

- [ ] Strong JWT secret (64+ characters, random)
- [ ] Secure database password
- [ ] CORS configured for production URL only
- [ ] Rate limiting enabled
- [ ] HTTPS enabled (SSL certificate)
- [ ] Razorpay signature verification working
- [ ] No sensitive data in error messages
- [ ] Database backups configured
- [ ] Environment variables never in code/git
- [ ] All test accounts removed or passwords changed

### Generate Secure JWT Secret

```bash
# Use one of these methods:
openssl rand -base64 64
# OR
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Common Issues & Fixes

### Issue 1: Database Connection Failed

**Symptoms:**
- Backend logs: `ECONNREFUSED`
- `Unable to connect to database`

**Fix:**
```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list               # Mac

# 2. Verify credentials in .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your-password>

# 3. Test connection
psql -U postgres -d dress_shop

# 4. If database doesn't exist:
createdb dress_shop
npm run db:init
```

### Issue 2: Port Already in Use

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::5000`

**Fix:**
```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9

# OR change port in .env:
PORT=5001
```

### Issue 3: CORS Errors

**Symptoms:**
- Browser console: `Access-Control-Allow-Origin`
- Frontend can't reach backend

**Fix:**
1. Backend `.env`: Set correct CLIENT_URL
   ```env
   CLIENT_URL=http://localhost:3000  # Development
   # OR
   CLIENT_URL=https://your-app.vercel.app  # Production
   ```

2. Restart backend server

3. Clear browser cache (Ctrl+Shift+R)

### Issue 4: Frontend Build Fails

**Symptoms:**
- `Error: Cannot find module`
- TypeScript errors during build

**Fix:**
```bash
cd client

# Clear everything
rm -rf .next node_modules package-lock.json

# Reinstall
npm install

# Try build again
npm run build
```

### Issue 5: Razorpay Checkout Not Appearing

**Symptoms:**
- Payment button doesn't work
- No Razorpay modal appears

**Fix:**
1. Check browser console for errors
2. Verify keys in both `.env` files:
   ```env
   # backend/.env
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=xxx

   # client/.env.local  
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx  # SAME as backend
   ```
3. Test Mode must be active for test keys
4. Production keys require KYC verification

### Issue 6: 404 on Dashboard Pages

**Symptoms:**
- `/dashboard/approvals` returns 404
- New pages not found

**Fix:**
```bash
cd client
rm -rf .next
npm run dev
# Hard refresh browser: Ctrl+Shift+R
```

### Issue 7: Images Not Loading

**Symptoms:**
- Product images show broken
- `Failed to load external image`

**Fix:**
Check `next.config.js`:
```javascript
images: {
  domains: ['images.unsplash.com', 'unsplash.com'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
}
```

### Issue 8: TypeScript Errors

**Symptoms:**
- Property X does not exist on type Y

**Common fixes:**
```typescript
// Fix 1: Accessing API response data
const response = await api.get('/api/endpoint');
const data = response.data;  // Add .data

// Fix 2: Type casting
const value = someValue as SpecificType;

// Fix 3: Optional chaining
user?.role  // Instead of user.role
```

---

## Known Bugs & Workarounds

### Bug 1: Support Chat "is_staff" vs "is_admin"

**Issue:** `TicketResponse` type uses `is_admin` but code references `is_staff`

**Fix Applied:** Updated all references to use `is_admin`

**Files:** 
- `client/app/dashboard/support-tickets/page.tsx`
- `client/components/SupportChat.tsx`

### Bug 2: AuthContext Missing "loading" Property

**Issue:** TypeScript error on `loading` property

**Temporary Workaround:**
```typescript
const { user } = useAuth();
// Instead of: const { user, loading } = useAuth();
```

**Permanent Fix:** Add `loading` to AuthContext type definition

### Bug 3: Return Request Status Type Mismatch

**Issue:** Status "pending" not in enum

**Fix:** Change status check:
```typescript
// Before:
if (request.status === 'pending')

// After:
if (request.status === 'requested')
```

### Bug 4: parseFloat on Price Strings

**Issue:** `price.toFixed is not a function`

**Fix Applied:** Convert strings to numbers:
```typescript
${parseFloat(product.price).toFixed(2)}
```

**Files Fixed:**
- ProductCard.tsx
- Cart.tsx
- OrderSuccess.tsx
- All product display components

---

## Post-Deployment Testing

### Essential Tests

1. **Authentication**
   - [ ] Register new user
   - [ ] Login with test account
   - [ ] JWT token persists
   - [ ] Logout works

2. **Shopping Flow**
   - [ ] Browse products
   - [ ] Add to cart
   - [ ] Update quantities
   - [ ] Checkout process
   - [ ] Payment (test mode)
   - [ ] Order confirmation

3. **Admin Functions**
   - [ ] Dashboard loads
   - [ ] Product CRUD
   - [ ] Order management
   - [ ] User management

4. **New Features**
   - [ ] Support chat appears
   - [ ] Create support ticket
   - [ ] Request product return
   - [ ] Manager approve order
   - [ ] Generate bill

5. **Mobile Testing**
   - [ ] Responsive on phone
   - [ ] Touch interactions work
   - [ ] Menu navigation
   - [ ] Checkout on mobile

---

## Monitoring & Maintenance

### Log Monitoring

**Render:**
- View logs in dashboard
- Set up log drains for persistence

**Vercel:**
- Analytics auto-enabled
- Monitor Core Web Vitals

### Database Backups

**Render:**
- Automatic daily backups (paid plan)
- Manual backup: Export via pgAdmin

**Railway:**
- Snapshots available
- Export with pg_dump

### Performance

**Backend:**
- Monitor response times
- Scale to multiple instances if needed
- Add Redis caching for heavy queries

**Frontend:**
- Use Vercel Analytics
- Monitor LCP, FID, CLS
- Optimize images

### Updates

```bash
# To deploy updates:
git add .
git commit -m "Update description"
git push origin main

# Auto-deploys on both Render and Vercel
```

---

## Emergency Rollback

### If Something Breaks in Production

**Vercel (Frontend):**
1. Go to Deployments
2. Find last working deployment
3. Click ⋯ → Promote to Production

**Render (Backend):**
1. Go to Deploys
2. Find last working deploy
3. Click Rollback

**Database:**
1. Stop backend
2. Restore from backup
3. Restart backend

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Razorpay Docs**: https://razorpay.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

**Good luck with your deployment! 🚀**

