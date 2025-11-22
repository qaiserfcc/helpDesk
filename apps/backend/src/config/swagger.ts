const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "HelpDesk API",
    description:
      "Comprehensive API documentation for the HelpDesk service, including auth, user, and ticketing flows.",
    version: "0.1.0",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Service health checks",
    },
    {
      name: "Metadata",
      description: "Information about the running service",
    },
    {
      name: "Auth",
      description: "Authentication and session management",
    },
    {
      name: "Users",
      description: "User profile and administration",
    },
    {
      name: "Tickets",
      description:
        "Ticket lifecycle, synchronization, and attachment operations",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Role: {
        type: "string",
        enum: ["user", "agent", "admin"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/Role" },
        },
        required: ["id", "name", "email", "role"],
      },
      AuthTokens: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
        },
        required: ["accessToken", "refreshToken"],
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          tokens: { $ref: "#/components/schemas/AuthTokens" },
        },
        required: ["user", "tokens"],
      },
      TicketPriority: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      TicketStatus: {
        type: "string",
        enum: ["open", "in_progress", "resolved"],
      },
      IssueType: {
        type: "string",
        enum: ["hardware", "software", "network", "access", "other"],
      },
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          description: { type: "string" },
          priority: { $ref: "#/components/schemas/TicketPriority" },
          issueType: { $ref: "#/components/schemas/IssueType" },
          status: { $ref: "#/components/schemas/TicketStatus" },
          attachments: {
            type: "array",
            items: { type: "string" },
          },
          creator: { $ref: "#/components/schemas/User" },
          assignee: {
            allOf: [{ $ref: "#/components/schemas/User" }],
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
        },
        required: [
          "id",
          "description",
          "priority",
          "issueType",
          "status",
          "attachments",
          "creator",
          "createdAt",
          "updatedAt",
        ],
      },
      TicketResponse: {
        type: "object",
        properties: {
          ticket: { $ref: "#/components/schemas/Ticket" },
        },
        required: ["ticket"],
      },
      TicketListResponse: {
        type: "object",
        properties: {
          tickets: {
            type: "array",
            items: { $ref: "#/components/schemas/Ticket" },
          },
        },
        required: ["tickets"],
      },
      TicketSyncResult: {
        type: "object",
        properties: {
          tempId: { type: "string" },
          ticket: { $ref: "#/components/schemas/Ticket" },
        },
        required: ["tempId", "ticket"],
      },
      TicketCreatePayload: {
        type: "object",
        properties: {
          description: { type: "string", minLength: 4 },
          priority: { $ref: "#/components/schemas/TicketPriority" },
          issueType: { $ref: "#/components/schemas/IssueType" },
          attachments: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["description"],
      },
      TicketUpdatePayload: {
        type: "object",
        properties: {
          description: { type: "string", minLength: 4 },
          priority: { $ref: "#/components/schemas/TicketPriority" },
          issueType: { $ref: "#/components/schemas/IssueType" },
          status: { $ref: "#/components/schemas/TicketStatus" },
        },
      },
      TicketSyncPayload: {
        type: "object",
        properties: {
          tickets: {
            type: "array",
            maxItems: 25,
            items: {
              type: "object",
              properties: {
                tempId: { type: "string" },
                description: { type: "string", minLength: 4 },
                priority: {
                  $ref: "#/components/schemas/TicketPriority",
                },
                issueType: { $ref: "#/components/schemas/IssueType" },
                attachments: {
                  type: "array",
                  items: { type: "string" },
                },
                createdAt: { type: "string", format: "date-time" },
              },
              required: ["tempId", "description"],
            },
          },
        },
        required: ["tickets"],
      },
      AssignmentPayload: {
        type: "object",
        properties: {
          assigneeId: { type: "string", format: "uuid" },
        },
      },
      AttachmentResponse: {
        allOf: [
          { $ref: "#/components/schemas/TicketResponse" },
          {
            type: "object",
            properties: {
              attachments: {
                type: "array",
                items: { type: "string" },
                description:
                  "Relative file paths that were added to the ticket.",
              },
            },
            required: ["attachments"],
          },
        ],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          statusCode: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns a simple heartbeat payload for monitoring.",
        responses: {
          200: {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/version": {
      get: {
        tags: ["Metadata"],
        summary: "Service metadata",
        description: "Returns static information about the API service.",
        responses: {
          200: {
            description: "Metadata returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    service: { type: "string", example: "helpdesk-backend" },
                    version: { type: "string", example: "0.1.0" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 2 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: {
                    $ref: "#/components/schemas/Role",
                    description: "Optional. Defaults to user when omitted.",
                  },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Invalid payload" },
          409: { description: "Email already in use" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate and obtain tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh an access token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  refreshToken: { type: "string", minLength: 1 },
                },
                required: ["refreshToken"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tokens refreshed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Missing refresh token" },
          401: { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/api/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get the authenticated user's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                  required: ["user"],
                },
              },
            },
          },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/users": {
      post: {
        tags: ["Users"],
        summary: "Create a user (admin only)",
        description: "Requires an admin token. Fails with 403 for non-admins.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 2 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: { $ref: "#/components/schemas/Role" },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                  required: ["user"],
                },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Authentication required" },
          403: { description: "Insufficient permissions" },
          409: { description: "Email already in use" },
        },
      },
    },
    "/api/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets visible to the caller",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { $ref: "#/components/schemas/TicketStatus" },
            description: "Filter by ticket status",
          },
          {
            name: "issueType",
            in: "query",
            schema: { $ref: "#/components/schemas/IssueType" },
            description: "Filter by issue type",
          },
          {
            name: "assignedToMe",
            in: "query",
            schema: { type: "boolean" },
            description:
              "When true, returns tickets assigned to the caller (agents only).",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100 },
            description: "Maximum number of tickets to return (default 50).",
          },
        ],
        responses: {
          200: {
            description: "List of tickets",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketListResponse" },
              },
            },
          },
          401: { description: "Authentication required" },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create a ticket",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketCreatePayload" },
            },
          },
        },
        responses: {
          201: {
            description: "Ticket created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketResponse" },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/tickets/diff": {
      get: {
        tags: ["Tickets"],
        summary: "Retrieve tickets updated after a timestamp",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "since",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
            description:
              "ISO timestamp that marks the lower bound for updates.",
          },
        ],
        responses: {
          200: {
            description: "Updated tickets",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketListResponse" },
              },
            },
          },
          400: { description: "Invalid parameters" },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/tickets/sync": {
      post: {
        tags: ["Tickets"],
        summary: "Bulk-ingest offline tickets",
        description:
          "Accepts up to 25 offline tickets and returns their persisted records.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketSyncPayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Tickets synced",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tickets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TicketSyncResult" },
                    },
                  },
                  required: ["tickets"],
                },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/tickets/{ticketId}": {
      get: {
        tags: ["Tickets"],
        summary: "Retrieve a ticket by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Ticket details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketResponse" },
              },
            },
          },
          401: { description: "Authentication required" },
          403: { description: "Forbidden" },
          404: { description: "Ticket not found" },
        },
      },
      patch: {
        tags: ["Tickets"],
        summary: "Update a ticket",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TicketUpdatePayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Updated ticket",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketResponse" },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Authentication required" },
          403: { description: "Forbidden" },
          404: { description: "Ticket not found" },
        },
      },
    },
    "/api/tickets/{ticketId}/assign": {
      post: {
        tags: ["Tickets"],
        summary: "Assign a ticket",
        description:
          "Agents/admins can assign tickets to themselves or another agent.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignmentPayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Assignment updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketResponse" },
              },
            },
          },
          400: { description: "Invalid payload" },
          401: { description: "Authentication required" },
          403: { description: "Insufficient permissions" },
          404: { description: "Ticket or assignee not found" },
        },
      },
    },
    "/api/tickets/{ticketId}/resolve": {
      post: {
        tags: ["Tickets"],
        summary: "Resolve a ticket",
        description:
          "Marks a ticket as resolved. Only agents or admins can resolve tickets.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Ticket resolved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketResponse" },
              },
            },
          },
          401: { description: "Authentication required" },
          403: { description: "Insufficient permissions" },
          404: { description: "Ticket not found" },
        },
      },
    },
    "/api/tickets/{ticketId}/attachments": {
      post: {
        tags: ["Tickets"],
        summary: "Upload ticket attachments",
        description:
          "Attach one or more files to an existing ticket. Requires authentication; regular users may only modify their own tickets.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
            description: "Identifier of the ticket receiving new files.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                  },
                },
                required: ["files"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Attachments stored successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AttachmentResponse" },
              },
            },
          },
          400: {
            description: "Malformed request or missing files",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "User is not permitted to modify the ticket",
          },
        },
      },
    },
  },
};

export default swaggerDocument;
