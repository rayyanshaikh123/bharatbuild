# BharatBuild Deployment & Configuration Guide

## 📋 Overview

This guide covers the complete setup and deployment process for the BharatBuild application, including frontend, backend, and mobile app.

---

## 🔧 Environment Configuration

### Frontend Setup

1. **Copy the environment template:**
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. **Configure variables in `.env.local`:**
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
     - Development: `http://localhost:3001`
     - Production: `https://api.yourdomain.com`

3. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

### Backend Setup

1. **Copy the environment template:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure critical variables in `.env`:**

   **Database (Required):**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```
   - For [Neon DB](https://neon.tech/): Use the connection string from your dashboard
   - For local PostgreSQL: `postgresql://postgres:password@localhost:5432/bharatbuild`

   **Session Secret (Required):**
   ```bash
   # Generate a secure random string:
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   **Email Configuration (Optional but recommended):**
   - For Gmail: Enable 2FA and create an [App Password](https://support.google.com/accounts/answer/185833)
   - Update `SMTP_USER` and `SMTP_PASS`

3. **Initialize the database:**
   ```bash
   # Run migrations
   node migrations/run_all_migrations.js
   
   # Optional: Seed with sample data
   node seed_complete_data.js
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

5. **Start the server:**
   ```bash
   # Development with auto-reload
   nodemon index.js
   
   # Production
   node index.js
   ```

---

## 🚀 Deployment Options

### Frontend Deployment (Next.js)

#### Option 1: Vercel (Recommended)
1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Deploy

#### Option 2: Netlify
1. Build the app: `pnpm build`
2. Deploy the `out` folder (if using static export) or connect to Git

#### Option 3: Self-hosted (VPS/Cloud)
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

**Nginx configuration example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

### Backend Deployment (Node.js)

#### Option 1: Railway
1. Connect GitHub repository
2. Add PostgreSQL plugin
3. Set environment variables
4. Deploy

#### Option 2: Render
1. Create new Web Service
2. Connect repository
3. Add PostgreSQL database
4. Configure environment variables
5. Deploy

#### Option 3: DigitalOcean/AWS/GCP
```bash
# Install PM2 for process management
npm install -g pm2

# Start the backend
pm2 start index.js --name bharatbuild-backend

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

**Nginx configuration for backend:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Mobile App Distribution

The APK is already built and available in `frontend/public/bharatbuild-app.apk`

#### Manual Distribution
Users can download directly from your website at: `https://yourdomain.com/bharatbuild-app.apk`

#### Google Play Store
1. Create a release keystore:
   ```bash
   cd app/android
   keytool -genkey -v -keystore bharatbuild-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bharatbuild
   ```

2. Update `android/app/build.gradle.kts` with signing configuration

3. Build signed APK:
   ```bash
   flutter build appbundle --release
   ```

4. Upload to Google Play Console

---

## 🔒 Security Checklist

### Before Production Deployment:

- [ ] Change all default passwords and secrets
- [ ] Use HTTPS for all connections (frontend & backend)
- [ ] Enable SSL for database connections
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS properly in backend
- [ ] Enable rate limiting on API endpoints
- [ ] Set up monitoring and error tracking (Sentry)
- [ ] Configure proper backup strategy for database
- [ ] Enable firewall rules on server
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` files to version control

### Database Security:
- Use strong passwords
- Enable SSL/TLS connections
- Restrict access by IP if possible
- Regular backups
- Keep PostgreSQL updated

---

## 📱 Mobile App Configuration

### Update API endpoints in app:
Edit `app/lib/config.dart`:
```dart
class Config {
  static const String apiUrl = 'https://api.yourdomain.com';
  static const String websiteUrl = 'https://yourdomain.com';
}
```

### Build release APK:
```bash
cd app
flutter clean
flutter pub get
flutter build apk --release
```

---

## 🔍 Testing Deployment

### Frontend Health Check:
```bash
curl https://yourdomain.com
```

### Backend Health Check:
```bash
curl https://api.yourdomain.com/health
# or
curl https://api.yourdomain.com/api/ping
```

### Database Connection:
Test database connectivity through the backend API or directly with `psql`:
```bash
psql "postgresql://user:password@host:port/database?sslmode=require"
```

---

## 📊 Monitoring & Maintenance

### Recommended Tools:
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **Performance**: New Relic, DataDog
- **Logs**: Papertrail, LogDNA

### Regular Maintenance:
- Monitor server resources (CPU, RAM, disk)
- Check application logs for errors
- Keep dependencies updated
- Perform regular database backups
- Monitor API response times

---

## 🆘 Troubleshooting

### Common Issues:

**Database Connection Failed:**
- Verify `DATABASE_URL` is correct
- Check firewall allows database port
- Ensure SSL is properly configured

**CORS Errors:**
- Update backend CORS configuration
- Check `NEXT_PUBLIC_API_URL` in frontend

**Session Issues:**
- Verify `SESSION_SECRET` is set
- Check cookie settings in production

**Build Failures:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all environment variables are set

---

## 📞 Support

For issues or questions:
- Check documentation in respective folders
- Review error logs
- Contact development team

---

## 📝 Version History

- **v1.0** - Initial deployment guide
- APK Size: 155.8 MB
- Node.js: v16+ required
- Flutter: v3.0+ required
- PostgreSQL: v12+ required

---

**Last Updated:** February 22, 2026
