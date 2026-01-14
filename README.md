# Help Desk Application

A comprehensive help desk system with web, mobile, and backend services. This monorepo contains all the necessary applications to run the help desk platform.

## Prerequisites

### macOS
- **Node.js**: v20.19.4 or higher ([Download](https://nodejs.org/))
- **npm**: Installed with Node.js (v10+)
- **PostgreSQL**: v14+ ([Download](https://www.postgresql.org/download/macosx/))
  - Or use Homebrew: `brew install postgresql@15`
- **Git**: ([Download](https://git-scm.com/download/mac))

### Windows
- **Node.js**: v20.19.4 or higher ([Download](https://nodejs.org/))
- **npm**: Installed with Node.js (v10+)
- **PostgreSQL**: v14+ ([Download](https://www.postgresql.org/download/windows/))
  - Ensure PostgreSQL server is running
- **Git**: ([Download](https://git-scm.com/download/win))

## Project Structure

```
helpDesk/
├── apps/
│   ├── backend/        # Express.js API server
│   ├── web-new/        # Next.js web application
│   └── mobile/         # React Native mobile app (Expo)
├── README.md           # This file
└── package.json        # Root workspace configuration
```

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all apps
cd apps/backend && npm install && cd ..
cd web-new && npm install && cd ..
cd mobile && npm install && cd ..
```

### 2. Database Setup

The backend requires PostgreSQL. Follow the setup guide in [apps/backend/README.md](./apps/backend/README.md#database-setup).

### 3. Run All Services

Start each service in a separate terminal:

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
# Backend will run on http://localhost:9000
```

**Terminal 2 - Web App:**
```bash
cd apps/web-new
npm run dev
# Web app will run on http://localhost:9001
```

**Terminal 3 - Mobile App (Expo):**
```bash
cd apps/mobile
npm start
# Follow prompts to run on Android, iOS, or web
```

## Individual App Setup

- **[Backend Setup](./apps/backend/README.md)** - Express API server with PostgreSQL
- **[Web App Setup](./apps/web-new/README.md)** - Next.js web application
- **[Mobile App Setup](./apps/mobile/README.md)** - React Native Expo application

## Troubleshooting

### Port Already in Use
- **Backend (port 9000)**: `lsof -i :9000` (macOS/Linux) or `netstat -ano | findstr :9000` (Windows)
- **Web (port 9001)**: `lsof -i :9001` (macOS/Linux) or `netstat -ano | findstr :9001` (Windows)
- Kill process: `kill -9 <PID>` (macOS/Linux) or `taskkill /PID <PID> /F` (Windows)

### PostgreSQL Not Running
**macOS:**
```bash
brew services start postgresql@15
```

**Windows:**
- Open Services (services.msc) and start "postgresql-x64-15" service

### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

See individual app READMEs for development guidelines and testing procedures.

## License

All rights reserved.
