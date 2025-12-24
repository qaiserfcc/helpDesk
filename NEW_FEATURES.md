# Help Desk - New Features Documentation

This document describes the new features and designer forms added to the Help Desk application.

## 📋 Table of Contents

1. [Agent Skills Management](#agent-skills-management)
2. [Agent Assignment Rules](#agent-assignment-rules)
3. [Knowledge Base](#knowledge-base)
4. [Canned Responses](#canned-responses)
5. [Ticket Templates](#ticket-templates)
6. [Ticket Tags](#ticket-tags)
7. [Visual Workflow Designer](#visual-workflow-designer)
8. [API Documentation](#api-documentation)

## 🎯 Agent Skills Management

### Overview
Define skills that agents possess for intelligent ticket routing based on expertise.

### Features
- Create, edit, and delete agent skills
- Assign skills to agents with proficiency levels (1-5 scale)
- View agents assigned to each skill
- Active/inactive status management

### Access
- **URL**: `/agent-skills`
- **Role Required**: Admin
- **API Endpoints**:
  - `GET /api/agent-skills` - List all skills
  - `POST /api/agent-skills` - Create new skill
  - `PATCH /api/agent-skills/:id` - Update skill
  - `DELETE /api/agent-skills/:id` - Delete skill
  - `POST /api/agent-skills/assign` - Assign skill to user
  - `DELETE /api/agent-skills/assign/:userId/:skillId` - Remove skill assignment

### Use Cases
- Network Support skill for network-related tickets
- Software Development skill for code-related issues
- Database Administration skill for DB tickets
- Hardware Support skill for physical equipment

## 🔄 Agent Assignment Rules

### Overview
Automated ticket routing based on conditions, skills, and categories.

### Features
- Define assignment rules with priorities
- Multiple assignment strategies:
  - Round Robin
  - Skill-based routing
  - Load-balanced distribution
- Condition-based matching
- Category and skill filters

### Access
- **URL**: Coming soon (backend ready)
- **Role Required**: Admin
- **API Endpoints**:
  - `GET /api/agent-assignment` - List rules
  - `POST /api/agent-assignment` - Create rule
  - `PATCH /api/agent-assignment/:id` - Update rule
  - `DELETE /api/agent-assignment/:id` - Delete rule
  - `POST /api/agent-assignment/find-agent` - Find best agent

### Assignment Strategies
1. **Round Robin**: Distribute tickets evenly among all agents
2. **Skill-based**: Match tickets to agents with required skills
3. **Load Balanced**: Assign to agent with lowest current workload

## 📚 Knowledge Base

### Overview
Self-service knowledge base with articles, FAQs, and guides.

### Features
- Rich text article content
- Full-text search functionality
- Tag-based organization
- Category association
- Publish/draft status
- View tracking
- Helpful/not helpful ratings
- Author attribution

### Access
- **URL**: `/knowledge-base`
- **Role Required**: All users can view; Admin/Agent can create
- **API Endpoints**:
  - `GET /api/knowledge-base` - List articles
  - `GET /api/knowledge-base/search?q=query` - Search articles
  - `POST /api/knowledge-base` - Create article
  - `PATCH /api/knowledge-base/:id` - Update article
  - `DELETE /api/knowledge-base/:id` - Delete article
  - `POST /api/knowledge-base/:id/rate` - Rate article

### Best Practices
- Use clear, descriptive titles
- Include step-by-step instructions
- Add relevant tags for discoverability
- Keep content up-to-date
- Use summaries for quick scanning

## 💬 Canned Responses

### Overview
Pre-written response templates for faster ticket resolution.

### Features
- Quick response templates
- Shortcut-based access (e.g., `/password-reset`)
- Category-based organization
- Active/inactive status
- Creator tracking

### Access
- **URL**: `/canned-responses`
- **Role Required**: Admin/Agent
- **API Endpoints**:
  - `GET /api/canned-responses` - List responses
  - `GET /api/canned-responses/shortcut/:shortcut` - Get by shortcut
  - `GET /api/canned-responses/search?q=query` - Search responses
  - `POST /api/canned-responses` - Create response
  - `PATCH /api/canned-responses/:id` - Update response
  - `DELETE /api/canned-responses/:id` - Delete response

### Example Use Cases
- Password reset instructions
- Welcome messages
- Common troubleshooting steps
- Status update templates
- Closing messages

## 📝 Ticket Templates

### Overview
Pre-configured ticket templates for common issue types.

### Features
- Pre-filled category and subcategory
- Default priority and issue type
- Default description
- Custom attribute defaults
- Active/inactive status

### Access
- **URL**: Coming soon (backend ready)
- **Role Required**: Admin
- **API Endpoints**:
  - `GET /api/ticket-templates` - List templates
  - `POST /api/ticket-templates` - Create template
  - `PATCH /api/ticket-templates/:id` - Update template
  - `DELETE /api/ticket-templates/:id` - Delete template

### Benefits
- Faster ticket creation
- Consistent information gathering
- Reduced user errors
- Standardized workflows

## 🏷️ Ticket Tags

### Overview
Flexible tagging system for ticket categorization and filtering.

### Features
- Custom tag creation
- Color coding
- Tag descriptions
- Usage tracking
- Active/inactive status

### Access
- **URL**: Coming soon (backend ready)
- **Role Required**: Admin creates tags; All users can use them
- **API Endpoints**:
  - `GET /api/ticket-tags` - List tags
  - `POST /api/ticket-tags` - Create tag
  - `PATCH /api/ticket-tags/:id` - Update tag
  - `DELETE /api/ticket-tags/:id` - Delete tag
  - `POST /api/ticket-tags/tickets/:ticketId/:tagId` - Add tag to ticket
  - `DELETE /api/ticket-tags/tickets/:ticketId/:tagId` - Remove tag
  - `GET /api/ticket-tags/tickets/:ticketId` - Get ticket tags

### Use Cases
- Priority markers (urgent, critical)
- Department tags (finance, HR, IT)
- Status indicators (awaiting-parts, escalated)
- Topic tags (email, vpn, printer)

## 🎨 Visual Workflow Designer

### Overview
Enhanced workflow designer with visual step representation.

### Features
- Visual timeline view
- Drag-and-drop step reordering (coming soon)
- Role-based color coding
- Action visualization
- Step numbering
- Completion indicator

### Usage
Navigate to `/workflow-management` and select a workflow to see the visual designer.

### Step Configuration
Each step includes:
- Name and description
- Order in workflow
- Initiator role (admin/agent/user/any)
- Allowed actions (create, update, assign, resolve, etc.)
- Conditions for transition

## 📡 API Documentation

### Authentication
All API endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Common Response Codes
- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Invalid payload
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found

### Pagination
List endpoints support optional pagination:
```
?page=1&limit=20
```

### Filtering
Many endpoints support filtering:
```
?active=true&categoryId=uuid
```

### Search
Search endpoints support query parameters:
```
?q=search+term&limit=10
```

## 🚀 Getting Started

### Backend Setup
1. Run database migrations:
   ```bash
   cd apps/backend
   npx prisma migrate dev
   ```

2. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd apps/web-new
   npm install
   ```

2. Configure environment variables:
   ```
   VITE_API_BASE_URL=http://localhost:4000
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

### Accessing New Features
1. Login as an admin user
2. Click "Admin Tools" in the header
3. Select the feature you want to use

## 🔒 Security Considerations

- Agent skills can only be managed by admins
- Knowledge articles can be created by admins and agents
- Canned responses can be created by admins and agents
- All other designer forms require admin access
- Proper role-based access control is enforced on all endpoints

## 📈 Future Enhancements

- [ ] Advanced workflow conditions editor
- [ ] Ticket merge functionality
- [ ] Bulk operations on tickets
- [ ] Custom dashboard widgets
- [ ] Service catalog
- [ ] Customer satisfaction (CSAT) surveys
- [ ] Automated ticket routing based on content analysis
- [ ] Time tracking for tickets
- [ ] Escalation rules engine
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Enhanced accessibility (ARIA labels, screen reader support)

## 🤝 Contributing

When adding new features:
1. Add database models to `apps/backend/prisma/schema.prisma`
2. Create service file in `apps/backend/src/services/`
3. Create route file in `apps/backend/src/routes/`
4. Register route in `apps/backend/src/routes/index.ts`
5. Create frontend service in `apps/web-new/src/services/`
6. Create frontend page in `apps/web-new/src/app/`
7. Add navigation link in `apps/web-new/src/components/Header.tsx`
8. Update this documentation

## 📞 Support

For questions or issues with these features, please create an issue in the repository or contact the development team.
