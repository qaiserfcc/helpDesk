# Multi-stage build for helpdesk backend
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json yarn.lock* package-lock.json* ./
RUN npm ci --silent

# Copy sources
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY api ./api
COPY scripts ./scripts

# Generate the Prisma client and build
RUN npx prisma generate
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 4000

# Healthcheck for container platforms
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/src/server.js"]
