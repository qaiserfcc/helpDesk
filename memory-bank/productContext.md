# Product Context

Cross-platform React Native + Express help desk app supporting ticket submission, assignment, resolution, and notification workflows even when devices are offline.

## Overview

Mobile clients (iOS/Android) built in React Native connect to an Express.js + PostgreSQL backend hosted on Vercel. Users authenticate via email/password, then create or manage tickets that sync between local SQLite storage and the server. Role-based access (User, Agent, Admin) determines dashboards, actions, and admin tooling. Notifications are delivered via Firebase Cloud Messaging and email (SendGrid/Nodemailer).

## Core Features

- Authentication with JWT access/refresh tokens and role-aware routing.
- Dashboard summaries for ticket statuses plus quick actions and sync indicators.
- Ticket CRUD with attachments, assignments, status updates, and offline queueing.
- Admin screens for user management, ticket allocation, and reporting.
- Push/email notifications for ticket lifecycle events.
- Offline-first conflict resolution via timestamps and auto-sync jobs.

## Technical Stack

- React Native (TypeScript), React Navigation, Zustand/Redux Toolkit, SQLite/WatermelonDB, Axios, Firebase Cloud Messaging.
- Express.js (TypeScript), Prisma ORM, PostgreSQL (Neon/Supabase), JWT auth, Firebase Admin SDK, Nodemailer/SendGrid, Vercel serverless deployment.
