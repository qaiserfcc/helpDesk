# MemoriPilot: System Architect

## Overview
Track high-level architecture choices for the Help Desk mobile + backend platform. Updated as milestones progress.

## Architectural Decisions

1. **Monorepo layout (`apps/backend`, `apps/mobile`)**: Keep backend Express API and React Native app side-by-side for easier shared config, linting, and CI workflows.
2. **Backend stack**: Express.js (TypeScript) with modular routing, Zod validation, Prisma ORM, and serverless-friendly entrypoint for Vercel. Env config handled via `dotenv` + typed helper.
3. **Database layer**: PostgreSQL via Prisma with base models for `User`, `Ticket`, and `DeviceToken`. Future migrations managed via Prisma migrate commands.
4. **Mobile stack**: Expo-managed React Native (TypeScript) with React Navigation, Zustand for lightweight state, and Tamagui-style theme tokens (custom). Offline persistence via `expo-sqlite` (WatermelonDB option later) plus background sync service shell.
5. **Networking**: Shared Axios client configured inside mobile app with interceptors for auth tokens, retry queue for offline mode, and env-driven base URL.
6. **Config management**: `.env` files per app with sample `.env.example`. Backend uses `env.ts` helper; mobile uses `@env` via `babel-plugin-module-resolver` placeholder until EAS secrets wired.

