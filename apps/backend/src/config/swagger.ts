const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'HelpDesk API',
    description: 'API documentation for the HelpDesk service, including health and metadata endpoints.',
    version: '0.1.0'
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local development server'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health checks'
    },
    {
      name: 'Metadata',
      description: 'Information about the running service'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns a simple heartbeat payload for monitoring.',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/version': {
      get: {
        tags: ['Metadata'],
        summary: 'Service metadata',
        description: 'Returns static information about the API service.',
        responses: {
          200: {
            description: 'Metadata returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string', example: 'helpdesk-backend' },
                    version: { type: 'string', example: '0.1.0' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default swaggerDocument;
