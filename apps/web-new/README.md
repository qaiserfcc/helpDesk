# Help Desk Web Application

Modern Next.js web application for the help desk system with real-time updates, server-side rendering, and responsive UI.

## Tech Stack

- **Framework**: Next.js 16+ with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + TanStack React Query
- **HTTP Client**: Axios
- **Real-time**: Socket.IO
- **Linting**: ESLint
- **Node**: v20.19.4+

## Prerequisites

### macOS
```bash
# Install Node.js (if not already installed)
brew install node@20

# Verify installation
node --version  # Should be v20.19.4 or higher
npm --version   # Should be v10+
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
cd apps/web-new

npm install
```

### 2. Configure Environment

The web app automatically connects to the backend API:

- **Backend API**: `http://localhost:9000/api` (default)
- **Web Port**: `9001` (default)

No `.env` configuration is required for development. The API URL is determined at runtime.

### 3. Start Development Server

```bash
cd apps/web-new

npm run dev
```

The application will be available at: **http://localhost:9001**

## Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server (requires build first)
npm start

# Run linting checks
npm run lint

# Lint and fix issues
npm run lint -- --fix
```

## Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/             # Authentication pages
│   ├── (dashboard)/        # Dashboard routes
│   └── layout.tsx          # Root layout
├── components/             # Reusable React components
│   ├── ui/                 # UI components (buttons, forms, etc)
│   ├── features/           # Feature-specific components
│   └── layouts/            # Page layouts
├── services/               # API service functions
│   ├── apiClient.ts        # Axios instance
│   ├── auth.ts             # Auth endpoints
│   ├── tickets.ts          # Ticket endpoints
│   └── ...
├── store/                  # Zustand store
│   ├── useAuthStore.ts     # Authentication state
│   └── ...
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
├── lib/                    # Utility functions
└── styles/                 # Global styles
```

### Key Features

#### Authentication
- JWT-based authentication with access/refresh tokens
- Protected routes with role-based access
- Automatic token refresh on 401 responses

#### Tickets Management
- Create, view, update, and delete tickets
- Real-time status updates
- Comment system with threading
- File attachments support
- Activity history tracking

#### Dashboard
- Ticket overview and statistics
- Workflow management
- User management (admin)
- Category and subcategory management

#### Real-time Updates
- Socket.IO connection for live updates
- Automatic refresh on ticket changes
- Real-time notifications

## Configuration

### API Base URL

The web app automatically determines the API URL:

```typescript
// apps/web-new/src/lib/api/config.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'
```

To use a different API URL in development:

```bash
# .env.local (create this file)
NEXT_PUBLIC_API_URL=http://your-api-url:port/api
```

### Socket.IO Configuration

Real-time features require a WebSocket connection to the backend:

```typescript
// Automatically configured to match API URL
// No additional configuration needed
```

## Common Tasks

### Add a New Page

```typescript
// src/app/(dashboard)/example/page.tsx
'use client';

export default function ExamplePage() {
  return <div>Example Page</div>;
}
```

### Create a New Component

```typescript
// src/components/Example.tsx
interface ExampleProps {
  title: string;
}

export function Example({ title }: ExampleProps) {
  return <div>{title}</div>;
}
```

### Make an API Call

```typescript
// src/services/example.ts
import { apiClient } from './apiClient';

export async function getExample(id: string) {
  const { data } = await apiClient.get(`/example/${id}`);
  return data;
}

// In a component:
import { useQuery } from '@tanstack/react-query';
import { getExample } from '@/services/example';

export function ExampleComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['example'],
    queryFn: () => getExample('123'),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{JSON.stringify(data)}</div>;
}
```

## Testing

The web app uses ESLint for code quality:

```bash
# Run linting checks
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## Troubleshooting

### Cannot Connect to Backend

**Error**: `Network error: Cannot reach backend`

**Solution**:
1. Verify backend is running on port 9000
   ```bash
   lsof -i :9000  # macOS/Linux
   # or
   netstat -ano | findstr :9000  # Windows
   ```

2. Check backend logs for errors

3. Verify API URL in browser console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```

### Port Already in Use

**Error**: `Port 9001 is already in use`

**Solution - macOS/Linux**:
```bash
lsof -i :9001
kill -9 <PID>
```

**Solution - Windows**:
```cmd
netstat -ano | findstr :9001
taskkill /PID <PID> /F
```

Or use a different port:
```bash
npm run dev -- -p 9002
```

### Authentication Not Working

**Error**: Login fails with 401/409

**Solution**:
1. Check backend is running and accessible
2. Clear browser cookies/localStorage:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
3. Hard refresh page (Cmd+Shift+R on macOS, Ctrl+Shift+R on Windows)
4. Check backend logs for error details

### Dependencies Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Performance Optimization

### Image Optimization
Use Next.js Image component for automatic optimization:

```typescript
import Image from 'next/image';

export function OptimizedImage() {
  return (
    <Image
      src="/example.png"
      alt="Example"
      width={800}
      height={600}
    />
  );
}
```

### Code Splitting
Next.js automatically splits code by route. Use dynamic imports for heavy components:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/Heavy'));

export default function Page() {
  return <HeavyComponent />;
}
```

### Query Caching
Configure React Query cache times:

```typescript
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:9000/api` | Backend API URL |
| `NODE_ENV` | `development` | Environment |

## Support

For issues or questions, check the main [README.md](../../README.md) or review browser console for error details.
