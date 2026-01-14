# Help Desk Backend

Express.js REST API server for the help desk application with real-time socket support, PostgreSQL database, and JWT authentication.

## Tech Stack

- **Runtime**: Node.js v20.19.4+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Authentication**: JWT (access & refresh tokens)
- **Real-time**: Socket.IO
- **Testing**: Vitest
- **Linting**: ESLint

## Prerequisites

### macOS
```bash
# Install Node.js (if not already installed)
brew install node@20

# Install PostgreSQL (if not already installed)
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
node --version  # Should be v20.19.4 or higher
psql --version  # Should be PostgreSQL 14+
```

### Windows
1. Download and install **Node.js v20.19.4+** from [nodejs.org](https://nodejs.org/)
2. Download and install **PostgreSQL 15** from [postgresql.org](https://www.postgresql.org/download/windows/)
3. During PostgreSQL installation, remember the password for the `postgres` user
4. Ensure PostgreSQL service is running:
   - Open Services (services.msc)
   - Find "postgresql-x64-15" and ensure it's running
5. Add PostgreSQL to PATH (usually automatic, verify with `psql --version`)

## Database Setup

### 1. Create PostgreSQL User and Database

**macOS/Linux:**
```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, run:
CREATE USER helpdesk WITH PASSWORD 'helpdesk123';
CREATE DATABASE helpdesk OWNER helpdesk;
CREATE DATABASE helpdesk_test OWNER helpdesk;
\q
```

**Windows (using psql):**
```bash
# Open Command Prompt or PowerShell
psql -U postgres

# In psql prompt, run:
CREATE USER helpdesk WITH PASSWORD 'helpdesk123';
CREATE DATABASE helpdesk OWNER helpdesk;
CREATE DATABASE helpdesk_test OWNER helpdesk;
\q
```

Or use pgAdmin GUI:
1. Right-click "Logins/Group Roles" → Create → Login
2. Enter username: `helpdesk`, password: `helpdesk123`
3. Right-click "Databases" → Create → Database
4. Name: `helpdesk`, Owner: `helpdesk`
5. Repeat for `helpdesk_test` database

### 2. Configure Environment Variables

```bash
cd apps/backend

# Copy example env file
cp .env.example .env
```

Edit `.env` file and configure:

```dotenv
PORT=9000
DATABASE_URL="postgresql://helpdesk:helpdesk123@localhost:5432/helpdesk"
JWT_ACCESS_SECRET="c7d67de3e69559657326832727533273325fa2f5d00360e7a0f20bc134ffa715"
JWT_REFRESH_SECRET="33435560358441fb629ef21293f15caec9cff0802ff6b69d5f40f625c2a19111"
ADMIN_EMAIL="admin@helpdesk.local"
ADMIN_PASSWORD="ChangeMe123!"
EMAIL_NOTIFICATIONS_ENABLED=false
EMAIL_FROM="Helpdesk Support <support@helpdesk.local>"
```

> **Security Note**: Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production. Generate secure secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Initialize Database

```bash
cd apps/backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed admin user (optional)
npm run seed:admin
```

## Development

### Start Development Server

```bash
cd apps/backend

npm run dev
# Server runs on http://localhost:9000
```

The server will:
- Auto-reload on file changes
- Log all requests and errors
- Provide real-time socket connections

### Available Scripts

```bash
# Development server with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled server
npm start

# Run tests
npm run test

# Run linting checks
npm run lint

# Lint and fix issues
npm run lint -- --fix

# Prisma management
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Create and run migrations
npm run prisma:reset      # Reset database (removes all data)
npm run prisma:seed       # Run seed scripts

# Seed admin user
npm run seed:admin
```

## API Routes

### Authentication Routes
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token

### Tickets Routes
- `GET /tickets` - List all tickets
- `GET /tickets/:id` - Get ticket details
- `POST /tickets` - Create new ticket
- `PATCH /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket

### Workflows Routes
- `GET /workflows` - List all workflows
- `POST /workflows/:id/steps/:stepId/complete` - Complete workflow step

### Categories Routes
- `GET /categories/all` - Get all categories
- `GET /categories/:id/subcategories` - Get subcategories

### Users Routes
- `GET /users` - List all users (admin only)
- `POST /users` - Create new user (admin only)
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Comments Routes
- `GET /tickets/:id/comments` - Get ticket comments
- `POST /tickets/:id/comments` - Add comment

## Real-time Features

The backend provides Socket.IO support for real-time updates:

### Socket Events
- `connect` - User connects
- `disconnect` - User disconnects
- `ticket:update` - Ticket updated
- `ticket:created` - Ticket created
- `comment:added` - Comment added on ticket
- `workflow:step:completed` - Workflow step completed

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- src/services/__tests__/auth.test.ts

# Generate coverage report
npm run test -- --coverage
```

## Troubleshooting

### PostgreSQL Connection Error
**Error**: `connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
- **macOS**: `brew services start postgresql@15`
- **Windows**: Start PostgreSQL service in Services (services.msc)
- Verify: `psql -U postgres -c "SELECT version();"`

### Migration Failed
```bash
# Reset database and re-run migrations
npm run prisma:reset

# Then re-run migrations
npm run prisma:migrate
```

### Port Already in Use
**macOS/Linux**:
```bash
lsof -i :9000
kill -9 <PID>
```

**Windows**:
```cmd
netstat -ano | findstr :9000
taskkill /PID <PID> /F
```

### Module Not Found
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run prisma:generate
```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9000` | Server port |
| `NODE_ENV` | `development` | Environment (development/production/test) |
| `DATABASE_URL` | - | PostgreSQL connection string (required) |
| `JWT_ACCESS_SECRET` | - | Secret for signing access tokens (required) |
| `JWT_REFRESH_SECRET` | - | Secret for signing refresh tokens (required) |
| `ADMIN_EMAIL` | `admin@helpdesk.local` | Default admin email |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Default admin password |
| `EMAIL_NOTIFICATIONS_ENABLED` | `false` | Enable email notifications |
| `RESEND_API_KEY` | - | API key for email service (optional) |

## Project Structure

```
src/
├── models/          # Database models and types
├── routes/          # API route handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── realtime/        # Socket.IO handlers
├── utils/           # Helper functions
├── scripts/         # Utility scripts
└── server.ts        # Main entry point
```

## Performance Tips

1. **Database Indexing**: Prisma automatically creates indexes for primary keys and foreign keys
2. **Query Optimization**: Use `.select()` to fetch only required fields
3. **Caching**: Implement Redis for frequently accessed data
4. **Rate Limiting**: Enable rate limiting for API endpoints in production

## Security Considerations

- Change JWT secrets in production
- Use HTTPS in production
- Implement CORS policy
- Add rate limiting
- Validate and sanitize all inputs
- Use environment variables for sensitive data

## Support

For issues or questions, check the main [README.md](../../README.md) or review logs for error details.
