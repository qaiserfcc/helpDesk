Web app enhancement ideas and next steps

1) UI Improvements
- Use a design system (Tailwind, Semantic UI, or MUI) for consistent layout
- Add responsive grid for desktop/tablet/smaller screen sizes
- Add keyboard shortcuts for nav & quick actions

2) Admin features
- Bulk ticket assignment & CSV export/import
- Advanced reporting and analytics (charts & agent performance)
- User management with role assignment & permissions

3) Realtime & notifications
- Show event stream to admin for live monitoring
- Inline notifications for ticket activity or messages
- Provide socket fallback and visual indicator when realtime is unavailable

4) Files & attachments
- Drag-and-drop upload on create ticket
- Thumbnail preview and URL generation for attachments

5) Tests & CI
- Add e2e tests for login, ticket creation, and event subscription (Cypress/Playwright)
- Add GitHub Action to verify web app build and run a minimal smoke test

6) Production readiness
- Add environment-based config for API endpoints and CDN
- Enable SSR with Next.js for SEO & better indexing if public pages are added
- Integrate Sentry or logging for error tracking
