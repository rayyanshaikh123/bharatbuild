# BharatBuild Quick Reference

## 🚀 Quick Commands

### Initial Setup

```bash
# 1. Backend Setup
cd backend
cp .env.example .env
# Edit .env with your credentials
pnpm install
node migrations/run_all_migrations.js
nodemon index.js

# 2. Frontend Setup (new terminal)
cd frontend
cp .env.example .env.local
# Edit .env.local with backend URL
pnpm install
pnpm dev

# 3. Mobile App (new terminal)
cd app
flutter pub get
flutter run
```

### Development

```bash
# Start backend
cd backend && nodemon index.js

# Start frontend
cd frontend && pnpm dev

# Run mobile app
cd app && flutter run

# Hot reload Flutter app
# Press 'r' in terminal or 'R' for full restart
```

### Database Operations

```bash
cd backend

# Run all migrations
node migrations/run_all_migrations.js

# Seed sample data (Pearl Project)
node seed_pearl_project.js

# Seed complete data
node seed_complete_data.js

# Connect to database
psql "$DATABASE_URL"

# Backup database
pg_dump "$DATABASE_URL" > backup.sql
```

### Building for Production

```bash
# Build frontend
cd frontend
pnpm build
pnpm start

# Build mobile APK
cd app
flutter clean
flutter build apk --release
# Output: app/build/app/outputs/flutter-apk/app-release.apk

# Build mobile App Bundle (for Play Store)
flutter build appbundle --release
```

### Environment Variables

```bash
# Generate secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Test environment variables
cd backend && node -e "require('dotenv').config(); console.log(process.env)"
```

### Git Operations

```bash
# Initial commit with .env.example files
git add .
git commit -m "Initial commit with environment templates"
git push

# Before committing, ensure .env files are ignored
git status
# Should NOT show .env files, only .env.example
```

### Testing & Debugging

```bash
# Check backend health
curl http://localhost:3001/api/ping

# Check database connection
cd backend && node -e "const pool = require('./db'); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows); pool.end(); })"

# View backend logs
cd backend && tail -f npm-debug.log

# Flutter device info
flutter devices

# Flutter doctor (check setup)
flutter doctor -v
```

### Deployment Checklist

```bash
# 1. Update environment variables for production
# - Set NODE_ENV=production
# - Use production DATABASE_URL
# - Set strong SESSION_SECRET
# - Update NEXT_PUBLIC_API_URL to production backend

# 2. Security checks
# - Verify .env is in .gitignore
# - Check CORS configuration
# - Enable HTTPS
# - Review API rate limiting

# 3. Build and deploy
cd frontend && pnpm build
cd backend && npm start

# 4. Database migrations on production
node migrations/run_all_migrations.js

# 5. Test production endpoints
curl https://api.yourdomain.com/api/ping
curl https://yourdomain.com
```

### Common Issues & Fixes

```bash
# Port already in use
# Kill process on port 3001 (backend)
npx kill-port 3001
# Kill process on port 3000 (frontend)
npx kill-port 3000

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Flutter build issues
cd app
flutter clean
flutter pub get
flutter pub cache repair

# Database connection issues
# Test connection string
psql "your_database_url_here"

# Reset database (CAUTION: deletes all data)
# Run in psql:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
# Then run migrations again
```

### Port Information

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- PostgreSQL: `5432` (default)
- Flutter DevTools: Random port (shown in console)

### Useful Links

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Landing Page**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

### Environment File Locations

```
bharatbuild/
├── backend/.env                    # Backend config (DO NOT COMMIT)
├── backend/.env.example            # Backend template (commit this)
├── frontend/.env.local             # Frontend config (DO NOT COMMIT)
├── frontend/.env.example           # Frontend template (commit this)
└── app/lib/config.dart            # Mobile app config
```

### APK Distribution

```bash
# APK location after build
app/build/app/outputs/flutter-apk/app-release.apk

# Copy to frontend for web download
cp app/build/app/outputs/flutter-apk/app-release.apk frontend/public/bharatbuild-app.apk

# APK will be available at:
http://localhost:3000/bharatbuild-app.apk
# or in production:
https://yourdomain.com/bharatbuild-app.apk
```

### Monitoring & Logs

```bash
# Backend logs (with PM2)
pm2 logs bharatbuild-backend

# Backend logs (systemd)
journalctl -u bharatbuild-backend -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check running Node processes
ps aux | grep node

# Check system resources
htop  # or 'top'
```

### Package Management

```bash
# Update dependencies
cd backend && pnpm update
cd frontend && pnpm update
cd app && flutter pub upgrade

# Check outdated packages
pnpm outdated
flutter pub outdated

# Install new package
pnpm add package-name
flutter pub add package_name
```

---

## 📋 Environment Variables Reference

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Session encryption key | Generate with crypto |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### Backend Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_USER` | Email username | `your_email@gmail.com` |
| `SMTP_PASS` | Email password/app password | `app_password` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `auth_token` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-xxx` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

---

## 🔧 Troubleshooting Quick Fixes

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
pnpm install
```

### "Database connection failed"
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL"
```

### "Port already in use"
```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill it
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Flutter build errors
```bash
flutter clean
flutter pub get
flutter pub cache repair
flutter build apk --release --verbose
```

---

**For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**
