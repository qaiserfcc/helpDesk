# Help Desk Mobile Application

React Native mobile application built with Expo for iOS and Android. Provides full ticket management, real-time updates, and offline functionality.

## Tech Stack

- **Framework**: React Native with Expo SDK 54+
- **Language**: TypeScript
- **State Management**: Zustand + TanStack React Query
- **HTTP Client**: Axios with interceptors
- **Navigation**: React Navigation
- **Database**: SQLite (offline support)
- **Real-time**: Socket.IO
- **Authentication**: JWT tokens with refresh
- **Node**: v20.19.4+

## Prerequisites

### macOS

```bash
# Install Node.js (if not already installed)
brew install node@20

# Install Watchman (improves file watching)
brew install watchman

# For iOS development, install CocoaPods
brew install cocoapods

# Verify installations
node --version      # Should be v20.19.4 or higher
watchman -v         # Should show version
pod --version       # Should show version
```

### Windows

1. Download and install **Node.js v20.19.4+** from [nodejs.org](https://nodejs.org/)
2. Verify installation in Command Prompt or PowerShell:
   ```bash
   node --version  # Should be v20.19.4 or higher
   npm --version   # Should be v10+
   ```

## Setup

### 1. Install Dependencies

```bash
cd apps/mobile

npm install
```

### 2. Configure Environment

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Verify your `.env` contains:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:9000/api
EXPO_PUBLIC_ENV=development
```

**Important**: For Android emulator, `localhost` is automatically mapped to `10.0.2.2` by the app. For physical devices, use your machine's IP address.

### 3. Start Development Server

```bash
cd apps/mobile

npm start
```

This launches the Expo development server. You'll see options to run on Android, iOS, or web.

## Running on Devices

### iOS (macOS only)

**Requirements**: macOS with Xcode installed

```bash
cd apps/mobile

# Install native dependencies
npm run pod:install

# Run on iOS simulator
npm run ios

# Or to run on specific simulator
npm run ios -- --simulator "iPhone 15"
```

### Android

**Requirements**: Android Studio and emulator, or physical device with USB debugging

```bash
cd apps/mobile

# Run on Android emulator
npm run android

# Run on physical device (ensure device is connected and developer mode enabled)
npm run android -- --device
```

### Web (Expo Web)

```bash
cd apps/mobile

npm run web
```

Runs at **http://localhost:19006**

## Available Scripts

```bash
# Start Expo development server
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Run on Android emulator/device
npm run android

# Run web version
npm run web

# Run linting checks
npm run lint

# Run unit tests
npm run test:unit

# Run all checks (lint + test)
npm run test

# Pod install (iOS only)
npm run pod:install
```

## Project Structure

```
src/
├── screens/              # Screen components
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── TicketDetailScreen.tsx
│   └── ...
├── components/           # Reusable components
├── services/             # API services
│   ├── apiClient.ts      # Axios instance
│   ├── auth.ts           # Auth endpoints
│   ├── tickets.ts        # Ticket endpoints
│   └── ...
├── store/                # Zustand stores
│   ├── useAuthStore.ts
│   └── ...
├── realtime/             # Socket.IO configuration
├── storage/              # Local storage and SQLite
├── hooks/                # Custom React hooks
├── types/                # TypeScript types
├── utils/                # Utility functions
├── config/               # Configuration files
│   └── env.ts            # Environment variables
└── navigation/           # Navigation setup
    └── AppNavigator.tsx
```

## Features

### Authentication
- Email and password login/registration
- JWT token management with auto-refresh
- Persistent session storage
- Offline queue for pending auth requests

### Tickets
- Create, view, and update tickets
- Real-time status updates
- Attachment upload
- Category and subcategory selection
- Custom fields support
- Activity history

### Comments & Collaboration
- Add comments to tickets
- File attachments in comments
- Threading support
- Real-time notifications

### Offline Support
- SQLite database for offline caching
- Offline request queue
- Automatic sync when online
- Works for most read operations

### Real-time Updates
- Socket.IO for live updates
- Automatic reconnection
- Event-driven data refresh

## API Configuration

The app automatically configures the API base URL from the environment:

```typescript
// apps/mobile/src/config/env.ts
const API_BASE_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000/api'
)
```

### Android Emulator Special Handling
On Android emulator, `localhost` is automatically mapped to `10.0.2.2`:

```typescript
// Example: http://localhost:9000/api → http://10.0.2.2:9000/api
```

### Physical Device
For physical devices, use your machine's IP address:

```bash
# Find your IP address
# macOS/Linux: ipconfig getifaddr en0
# Windows: ipconfig

# Then use in .env
EXPO_PUBLIC_API_URL=http://192.168.1.100:9000/api
```

## Development Workflow

### Hot Reload
Changes are automatically reloaded when you save files. Press `r` in the terminal to manually reload.

### Debugging
```bash
# Open Expo Developer Tools in the app
# Shake device (or press Ctrl+M on Android emulator)
# Select "Open Expo DevTools"
```

### Console Logs
View logs in the Expo CLI terminal or in Expo DevTools.

## Testing

```bash
# Run unit tests
npm run test:unit

# Run linting
npm run lint

# Fix lint issues
npm run lint -- --fix

# Run all tests
npm run test
```

## Troubleshooting

### Expo Server Won't Start

**Error**: `Metro bundler stuck` or `Watchman connection failed`

**Solution - macOS**:
```bash
# Reset Metro bundler
npx react-native start --reset-cache

# Or reset Watchman
watchman watch-del-all
rm -rf node_modules/.cache
```

**Solution - Windows**:
```bash
npm start -- --clear
```

### Android Emulator Issues

**Error**: `Unable to resolve module`

**Solution**:
```bash
# Clear Metro cache
npm start -- --reset-cache

# Or reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error**: Emulator not detected

**Solution**:
1. Ensure Android Studio is installed
2. Start emulator from Android Studio
3. Verify device connection: `adb devices`
4. Run: `npm run android`

### iOS Issues (macOS)

**Error**: CocoaPods issues

**Solution**:
```bash
cd apps/mobile

# Reinstall pods
rm -rf ios/Pods ios/Podfile.lock
npm run pod:install
```

**Error**: Xcode not found

**Solution**:
```bash
# Install command line tools
xcode-select --install

# Or update Xcode from App Store
```

### Cannot Connect to Backend

**Error**: Network error when trying to login

**Solution**:
1. Verify backend is running on port 9000:
   ```bash
   # From another terminal
   lsof -i :9000  # macOS/Linux
   # or
   netstat -ano | findstr :9000  # Windows
   ```

2. Check correct API URL in `.env`:
   ```bash
   # For Android emulator: should be 10.0.2.2
   # For physical device: should be your machine's IP
   # For web: should be localhost
   ```

3. Clear app cache and restart:
   ```bash
   npm start -- --clear
   ```

### Module Resolution Errors

**Error**: Cannot resolve module `react-native-web` or similar

**Solution**:
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Restart Expo
npm start -- --clear
```

### Socket.IO Connection Failed

**Error**: `Realtime socket failed`

**Solution**:
1. Ensure backend is running
2. Verify WebSocket port matches API port
3. Check if firewall blocks connections
4. Clear app and restart

## Performance Tips

1. **Use React Query**: Leverage caching and invalidation
2. **Avoid Re-renders**: Use `useCallback` and `useMemo`
3. **Image Optimization**: Compress images before upload
4. **Offline Caching**: Utilize SQLite for frequent queries
5. **Code Splitting**: Lazy load heavy components

## Security Considerations

- Never commit `.env` file with real secrets
- Use secure storage for tokens (already implemented)
- Validate all user inputs
- Use HTTPS in production
- Implement certificate pinning for API communication

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:9000/api` | Backend API URL |
| `EXPO_PUBLIC_ENV` | `development` | Environment |

## Device-Specific Notes

### iOS
- Requires macOS for development
- Test on simulator or real device
- Handle permission requests for camera, microphone, etc.

### Android
- Works on Windows, macOS, and Linux
- Requires 2GB+ emulator RAM
- Test on emulator or physical device with USB debugging

### Web
- Runs in browser using Expo Web
- Limited to web-compatible APIs
- Useful for quick testing and debugging

## Useful Commands

```bash
# View Expo documentation in terminal
expo-cli

# Start with specific device
npm start -- --ios
npm start -- --android

# Open iOS Simulator directly
open -a Simulator

# Reset everything
rm -rf node_modules .expo package-lock.json
npm install
npm start -- --clear
```

## Support

For issues or questions:
1. Check the main [README.md](../../README.md)
2. Review error messages in Expo CLI
3. Check application logs in Expo DevTools
4. Review backend logs for API issues

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Axios Documentation](https://axios-http.com)
- [React Query Documentation](https://tanstack.com/query)
