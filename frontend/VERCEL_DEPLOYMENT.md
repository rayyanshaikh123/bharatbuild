# 🚀 Vercel Deployment Guide

## Frontend Deployment (Next.js)

### Quick Deploy

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Connect to Vercel**
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

4. **Deploy**
   ```bash
   vercel --prod
   # OR just push to GitHub (auto-deploys)
   ```

---

## APK Hosting with Vercel Blob

### Step 1: Create Blob Store

1. Go to [Vercel Dashboard → Storage](https://vercel.com/dashboard/stores)
2. Click "Create Database" → Select "Blob"
3. Name it: `bharatbuild-storage`
4. Copy the `BLOB_READ_WRITE_TOKEN`

### Step 2: Add Environment Variable

**Local (.env.local):**
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxx
```

**Vercel Dashboard:**
- Go to Settings → Environment Variables
- Add `BLOB_READ_WRITE_TOKEN` with your token

### Step 3: Upload APK

```bash
# Make sure APK is in public/ folder
node scripts/upload-apk.js
```

This will output a public URL like:
```
https://xxxxxxxxxx.public.blob.vercel-storage.com/bharatbuild-app.apk
```

### Step 4: Update Landing Page

Copy the URL from step 3 and update [app/page.tsx](../app/page.tsx):

```tsx
<a 
  href="https://xxxxxxxxxx.public.blob.vercel-storage.com/bharatbuild-app.apk" 
  download="BharatBuild-App.apk"
  // ... rest of props
>
```

Commit and push:
```bash
git add app/page.tsx
git commit -m "Update APK URL to Vercel Blob"
git push
```

---

## Backend Deployment Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Render
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your backend repo
4. Add environment variables from `.env.example`
5. Deploy

### Option 3: Vercel (Node.js API)
```bash
cd backend
vercel
# Follow prompts
```

**Update frontend API URL:**
```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

---

## Production Checklist

### Frontend
- [ ] Environment variables set in Vercel
- [ ] APK uploaded to Vercel Blob
- [ ] Landing page APK link updated
- [ ] API URL points to production backend
- [ ] Domain configured (optional)
- [ ] Analytics added (optional)

### Backend
- [ ] Database URL configured (production DB)
- [ ] Session secret generated (strong)
- [ ] SMTP credentials added
- [ ] CORS configured for frontend domain
- [ ] Environment variables secured
- [ ] Database migrations run

### Security
- [ ] All `.env` files in `.gitignore`
- [ ] No sensitive data in repository
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Rate limiting configured
- [ ] Input validation enabled

---

## Vercel CLI Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs

# List deployments
vercel ls

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL

# Pull environment variables
vercel env pull
```

---

## Domain Setup

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records (Vercel provides instructions)
4. Wait for DNS propagation (5-10 minutes)

---

## Monitoring

- **Vercel Analytics**: Enabled by default
- **Error Tracking**: Add Sentry DSN to environment variables
- **Logs**: Available in Vercel Dashboard → Deployments → Functions

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Verify all dependencies in `package.json`
- Test build locally: `npm run build`

### Environment Variables Not Working
- Make sure they start with `NEXT_PUBLIC_` for client-side
- Redeploy after adding new variables
- Check they're set for the right environment (Production/Preview)

### APK Upload Fails
- Verify `BLOB_READ_WRITE_TOKEN` is correct
- Check APK file exists in `public/` folder
- Ensure `@vercel/blob` package is installed

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Blob**: https://vercel.com/docs/storage/vercel-blob
- **Next.js on Vercel**: https://nextjs.org/docs/deployment

---

**Last Updated:** February 22, 2026
