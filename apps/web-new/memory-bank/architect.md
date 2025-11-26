# MemoriPilot: System Architect

## Overview
This file contains the architectural decisions and design patterns for the MemoriPilot project.

## Architectural Decisions

- Use Next.js App Router for web app to leverage server components and modern routing
- Maintain Zustand stores for state management to match mobile architecture
- Implement socket.io-client for web realtime to preserve mobile behaviors
- Apply Tailwind CSS for responsive desktop UI design
- Use localStorage for web persistence instead of Expo secureStore



1. **Decision 1**: Description of the decision and its rationale.
2. **Decision 2**: Description of the decision and its rationale.
3. **Decision 3**: Description of the decision and its rationale.



## Components

### Web Frontend

Next.js 16 web application with App Router for routing and server components

**Responsibilities:**

- Provide desktop UI with functional parity to mobile app
- Handle authentication and role-based access
- Manage realtime socket connections
- Implement offline detection and sync

### Backend API

Shared Express.js backend with PostgreSQL and Prisma

**Responsibilities:**

- Provide REST endpoints for tickets, users, auth
- Handle realtime notifications via Socket.io
- Support offline sync operations

### Mobile App

React Native mobile app with Expo

**Responsibilities:**

- Mobile-first UI for ticket management
- Offline storage with SQLite
- Push notifications and realtime updates



