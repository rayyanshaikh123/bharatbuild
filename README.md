# BharatBuild - Industrial Construction Management Platform

<div align="center">

![BharatBuild](https://img.shields.io/badge/BharatBuild-v1.0-orange?style=for-the-badge)
![Flutter](https://img.shields.io/badge/Flutter-3.0+-blue?style=for-the-badge&logo=flutter)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-16+-green?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue?style=for-the-badge&logo=postgresql)

*Unified Industrial Field OS for Construction Management*

[Live Demo](#) | [Documentation](./DEPLOYMENT_GUIDE.md) | [Download APK](./frontend/public/bharatbuild-app.apk)

</div>

---

## 🌟 Overview

**BharatBuild** is a comprehensive enterprise-grade construction management platform that standardizes massive infrastructure through blueprint-level field digitization and real-time site orchestration. Built for the modern construction industry, it provides end-to-end project management, workforce coordination, and material tracking.

### Key Features

- 🏗️ **Real-time Site Management** - Track multiple construction sites with live updates
- 📱 **Offline-First Mobile App** - Work seamlessly without connectivity, sync when online
- 📊 **DPR & Progress Tracking** - Automated daily progress reports with photo documentation
- 👷 **Workforce Management** - Attendance, wages, and contractor coordination
- 📦 **Material Inventory** - Track materials, purchases, and stock levels
- 🗺️ **Geofencing & Location** - GPS-based attendance and site verification
- 📄 **Document Management** - Upload and manage site documents, blueprints, and reports
- 🔒 **Role-Based Access** - Secure access control for different user roles
- 📈 **Analytics & Reporting** - Comprehensive dashboards and insights

---

## 🏛️ Architecture

```
bharatbuild/
├── frontend/          # Next.js web application
├── backend/           # Node.js + Express API server
├── app/              # Flutter mobile application (iOS/Android)
└── DEPLOYMENT_GUIDE.md
```

### Tech Stack

**Frontend (Web):**
- Next.js 14+ (React 18)
- TypeScript
- TailwindCSS
- Shadcn UI Components

**Backend (API):**
- Node.js + Express
- PostgreSQL (Neon DB)
- JWT Authentication
- REST API

**Mobile App:**
- Flutter 3.0+
- Dart
- Offline-first architecture
- ML Kit (Face detection, OCR)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and pnpm/npm
- PostgreSQL 12+ database
- Flutter 3.0+ (for mobile app)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bharatbuild.git
cd bharatbuild
```

### 2. Setup Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials and API keys
nano .env  # or use your preferred editor

# Install dependencies
pnpm install

# Run database migrations
node migrations/run_all_migrations.js

# (Optional) Seed sample data
node seed_complete_data.js

# Start development server
nodemon index.js
```

**Backend will run on:** `http://localhost:3001`

### 3. Setup Frontend

```bash
cd frontend

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your backend URL
nano .env.local

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

**Frontend will run on:** `http://localhost:3000`

### 4. Setup Mobile App (Optional)

```bash
cd app

# Get Flutter dependencies
flutter pub get

# Run on Android emulator or device
flutter run

# Build release APK
flutter build apk --release
```

**APK Location:** `app/build/app/outputs/flutter-apk/app-release.apk`

---

## ⚙️ Configuration

### Environment Variables

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your_generated_secret_here
PORT=3001

# Optional: Email, SMS, AI features
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
OPENAI_API_KEY=your_openai_key
```

See [`.env.example`](backend/.env.example) files in each directory for complete configuration options.

---

## 📱 Mobile App Download

The Android APK is available for direct download:

- **Size:** 155.8 MB
- **Location:** [`frontend/public/bharatbuild-app.apk`](./frontend/public/bharatbuild-app.apk)
- **Web Download:** Available on the landing page after deployment

### Installation Instructions for Users:

1. Download the APK from your website
2. Enable "Install from Unknown Sources" in Android settings
3. Open the APK file and install
4. Launch BharatBuild app and login

---

## 🎯 Main Features

### For Project Managers
- Create and manage multiple projects
- Monitor real-time progress across sites
- Review and approve DPRs
- Track material consumption and costs
- Generate comprehensive reports

### For Site Engineers
- Submit daily progress reports (DPR)
- Upload site photos with geo-tagging
- Track material usage and requests
- Manage workforce attendance
- Offline data entry with auto-sync

### For Contractors & Workers
- Clock in/out with GPS verification
- View assigned tasks and schedules
- Submit work completion reports
- Track payment and wage history

### For Admins
- User and role management
- System configuration
- Database backups and maintenance
- Analytics and insights

---

## 📖 Documentation

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete hosting and deployment instructions
- **[Backend API Documentation](./backend/API_ROUTES.md)** - API endpoints reference
- **[Frontend Integration](./FRONTEND_INTEGRATION_PLAN.md)** - Frontend architecture guide
- **Database Schema** - Available in `backend/db.sql`

---

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Session management with secure cookies
- Role-based access control (RBAC)
- SQL injection protection
- XSS prevention
- CORS configuration
- HTTPS enforcement (production)
- Environment variable management

---

## 🌐 Deployment

### Quick Deploy Options

**Frontend:**
- [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
- Netlify, AWS Amplify, or any Node.js hosting

**Backend:**
- Railway, Render, Heroku
- DigitalOcean, AWS EC2, Google Cloud

**Database:**
- [Neon DB](https://neon.tech) (recommended)
- Supabase, AWS RDS, or self-hosted PostgreSQL

See the [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
pnpm test

# Mobile app tests
cd app
flutter test
```

---

## 📊 Project Status

- ✅ Core backend API
- ✅ Frontend web application
- ✅ Mobile app (Android)
- ✅ Database schema and migrations
- ✅ Authentication & authorization
- ✅ DPR management
- ✅ Material inventory
- ✅ Workforce management
- ✅ Document uploads
- 🚧 iOS app (in progress)
- 🚧 Advanced analytics dashboard
- 🚧 Automated notifications

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 👥 Team

Developed for the construction management industry.

---

## 📞 Support

For support and queries:
- Email: stallspot.info@gmail.com
- Documentation: See docs folder
- Issues: Open a GitHub issue

---

## 🙏 Acknowledgments

- Built with Flutter, Next.js, and Node.js
- UI components from Shadcn UI
- Icons from Lucide Icons
- Database hosted on Neon DB

---

<div align="center">

**Made with ❤️ for the Construction Industry**

⭐ Star this repo if you find it useful!

</div>
