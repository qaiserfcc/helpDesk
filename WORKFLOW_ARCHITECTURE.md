# Workflow Constraints Architecture

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Action                               │
│  (Update/Assign/Resolve/Comment on Ticket)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Endpoint                                   │
│  PATCH /tickets/:id                                             │
│  POST  /tickets/:id/assign                                      │
│  POST  /tickets/:id/resolve                                     │
│  POST  /tickets/:id/replies                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Ticket Service Function                             │
│  - updateTicket()                                               │
│  - assignTicket()                                               │
│  - resolveTicket()                                              │
│  - addTicketReply()                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           validateWorkflowAction()                               │
│  ┌────────────────────────────────────────┐                     │
│  │ 1. Get ticket with workflow info       │                     │
│  │ 2. Check if workflow exists            │                     │
│  │ 3. Get current step                    │                     │
│  │ 4. Call canUserPerformAction()         │                     │
│  │ 5. Return allowed/denied               │                     │
│  └────────────────────────────────────────┘                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ├─── ALLOWED ───┐
                       │                │
                       │                ▼
                       │    ┌───────────────────────────┐
                       │    │   Execute Action          │
                       │    │   - Update database       │
                       │    │   - Log activity          │
                       │    │   - Send notifications    │
                       │    └───────────────────────────┘
                       │
                       └─── DENIED ────┐
                                        │
                                        ▼
                            ┌───────────────────────────┐
                            │  Return 403 Error         │
                            │  "Workflow constraint     │
                            │   violation"              │
                            └───────────────────────────┘
```

## Workflow Step Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           canUserPerformAction(stepId, action, role)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Get Workflow Step            │
          │   from Database                │
          └────────────┬───────────────────┘
                       │
                       ▼
          ┌────────────────────────────────┐
          │  Check Step Initiator Role     │
          │  (if specified)                │
          └────────────┬───────────────────┘
                       │
                       ├─── Role Matches ──────┐
                       │                        │
                       │                        ▼
                       │          ┌─────────────────────────┐
                       │          │ Check Allowed Actions   │
                       │          │ for Step                │
                       │          └──────┬──────────────────┘
                       │                 │
                       │                 ├── Action in List ──> RETURN TRUE
                       │                 │
                       │                 └── Action not in List ─> RETURN FALSE
                       │
                       └─── Role Mismatch ────> RETURN FALSE
```

## UI Component Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              Ticket Detail Page                                  │
│  /ticket/[ticketId]                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│         WorkflowActionControls Component                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │  useQuery: fetchAllowedActions()     │
    │  GET /workflows/tickets/:id/         │
    │      allowed-actions                 │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌────────────────────────────────────────────────┐
    │  Response:                                     │
    │  {                                             │
    │    currentStep: { id, name, ... },            │
    │    allowedActions: ["update", "comment"],     │
    │    canAdvance: true                           │
    │  }                                             │
    └────────────┬───────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Render UI:                      │
    │  - Show current step name        │
    │  - Display allowed actions grid  │
    │  - Show advance button (if can)  │
    └──────────────┬───────────────────┘
                   │
                   │ User clicks "Advance"
                   ▼
    ┌──────────────────────────────────┐
    │  Show confirmation dialog        │
    │  - Optional notes field          │
    │  - Confirm/Cancel buttons        │
    └──────────────┬───────────────────┘
                   │
                   │ User confirms
                   ▼
    ┌──────────────────────────────────┐
    │  useMutation:                    │
    │  advanceWorkflowStep()           │
    │  POST /workflows/tickets/:id/    │
    │       advance                    │
    └──────────────┬───────────────────┘
                   │
                   ├─── Success ──────┐
                   │                  │
                   │                  ▼
                   │    ┌─────────────────────────┐
                   │    │ - Show success toast    │
                   │    │ - Invalidate queries    │
                   │    │ - Refresh ticket data   │
                   │    │ - Close dialog          │
                   │    └─────────────────────────┘
                   │
                   └─── Error ───────┐
                                     │
                                     ▼
                       ┌─────────────────────────┐
                       │ - Show error toast      │
                       │ - Keep dialog open      │
                       └─────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────┐
│   Ticket            │
│  ─────────────────  │
│  id                 │
│  workflowId    ────────┐
│  currentStepId ─────┐  │
│  status             │  │
│  ...                │  │
└─────────────────────┘  │
                         │
        ┌────────────────┘
        │
        ▼
┌──────────────────────┐           ┌─────────────────────┐
│ WorkflowDefinition   │           │   WorkflowStep      │
│ ───────────────────  │           │  ─────────────────  │
│ id                   │           │  id           ◄─────┘
│ name                 │           │  workflowId   ────┐
│ categoryId           │◄──────────│  name             │
│ version              │           │  order            │
│ active               │           │  initiatorRole    │
│ ...                  │           │  allowedActions   │
└──────────────────────┘           │  conditions       │
                                   └───────────────────┘

allowedActions = ["create", "update", "assign", "resolve", "escalate", "comment"]
initiatorRole = "admin" | "agent" | "user" | null (any role)
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 1: Authentication                       │
│  - JWT token validation                                         │
│  - User session verification                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                Layer 2: Route Authorization                      │
│  - Role-based access control                                    │
│  - Endpoint permission checks                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│             Layer 3: Workflow Constraint Validation              │
│  - Step-level action permissions                                │
│  - Role matching for step initiators                            │
│  - Allowed actions verification                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│               Layer 4: Data Validation                           │
│  - Zod schema validation                                        │
│  - Type safety checks                                           │
│  - Input sanitization                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
              ┌────────────────────┐
              │  Execute Action    │
              └────────────────────┘
```

## Key Components

### Backend
- **validateWorkflowAction()**: Core validation function
- **canUserPerformAction()**: Checks if action is allowed at step
- **getAllowedActionsForTicket()**: Returns current step permissions
- **advanceTicketWorkflowStep()**: Advances workflow to next step

### Frontend
- **WorkflowActionControls**: Main UI component
- **fetchAllowedActions()**: Service function to get permissions
- **advanceWorkflowStep()**: Service function to advance workflow
- **useToastStore**: Notification system for feedback

### API Endpoints
- `GET /workflows/tickets/:ticketId/allowed-actions`
- `POST /workflows/tickets/:ticketId/advance`
- `PATCH /tickets/:ticketId` (with validation)
- `POST /tickets/:ticketId/assign` (with validation)
- `POST /tickets/:ticketId/resolve` (with validation)
- `POST /tickets/:ticketId/replies` (with validation)

## Example Workflow Scenario

1. **Ticket Created** → Step 1: "Initial Review" (agent role)
   - Allowed: comment, update
   - User Role: agent ✓
   
2. **Agent Updates** → Validation passes
   - Action: update ✓ (in allowed list)
   - Role: agent ✓ (matches step role)
   
3. **Agent Advances** → Step 2: "Investigation" (agent role)
   - Allowed: comment, assign, escalate
   
4. **Agent Assigns** → Validation passes
   - Action: assign ✓ (in allowed list)
   
5. **Agent Resolves** → Validation FAILS
   - Action: resolve ✗ (not in allowed list for current step)
   - Error: 403 "Action 'resolve' is not allowed at the current workflow step"
   
6. **Agent Advances** → Step 3: "Resolution" (agent role)
   - Allowed: resolve, comment
   
7. **Agent Resolves** → Validation passes
   - Action: resolve ✓ (in allowed list)
   - Workflow complete!
