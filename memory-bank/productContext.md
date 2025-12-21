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


## Project Description

A comprehensive helpdesk ticketing system with multi-platform support (backend API, web portal, mobile apps). Recently enhanced with AI-powered suggestions, configurable workflows, categories/subcategories, and custom attributes system for tickets. Supports role-based access control (admin, agent, user), real-time notifications via Socket.io, and push notifications for mobile devices.



## Architecture

Monorepo structure with three main applications: 1) Backend API (Node.js + Express + TypeScript + Prisma ORM with PostgreSQL), 2) Web frontend (Next.js 14 with App Router + React + TypeScript + Tailwind CSS), 3) Mobile app (Expo + React Native + TypeScript). Backend exposes RESTful API with Socket.io for real-time features. Web and mobile share similar API client patterns using TanStack Query for data fetching. Database uses PostgreSQL with Prisma migrations. Theme system centralized across platforms with dark theme (purple #7C3AED to cyan #06B6D4 gradient).



## Technologies

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Next.js 14
- React
- React Native
- Expo
- TanStack Query
- Socket.io
- Zustand
- Tailwind CSS
- OpenAI API
- JWT authentication



## Libraries and Dependencies

- prisma@7.0.0
- express
- socket.io
- jsonwebtoken
- bcrypt
- zod
- axios
- http-errors
- @tanstack/react-query
- react-navigation
- expo-notifications
- next
- react
- react-native

