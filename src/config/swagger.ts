import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Xpro.li API Documentation',
      version: '1.0.0',
      description: 'API documentation for Xpro.li - Advanced URL Management Platform',
      contact: {
        name: 'Xpro.li Support',
        email: 'support@xpro.li'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.xpro.li',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.ts'] // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options); 