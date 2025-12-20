import { SwaggerOptions } from "@fastify/swagger";
import { FastifyRegisterOptions } from "fastify";

export const swaggerOption: FastifyRegisterOptions<SwaggerOptions> = {
  prefix: "/docs",
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Commitly API",
      description:
        "This commitly api is built to serve the frontend application",
      version: "0.0.1",
      contact: {
        email: "hello@mainheart.co",
        name: "Mainheart Ltd",
        url: "https://www.mainheart.co",
      },
    },

    servers: [
      {
        url: "https://stagingapi.commitly.io/",
        description: "Staging server",
      },
      {
        url: "http://localhost:3011",
        description: "Development server",
      },
    ],
    tags: [
      { name: "auth", description: "Auth related end-points" },
      { name: "user", description: "User related end-points" },
      { name: "goals", description: "Device management end-points" },
      { name: "todos", description: "Device management end-points" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key required to access tenant-protected endpoints.",
        },
      },

      schemas: {
        Tenant: {
          type: "object",
          required: [
            "id",
            "name",
            "domain",
            "apiKey",
            "status",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            },
            name: { type: "string", example: "Finecore" },
            domain: { type: "string", example: "finecore.co" },
            apiKey: { type: "string", example: "fc_live_3kj2h2j3h2jh23h23jh" },
            status: { $ref: "#/components/schemas/TenantStatus" },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-01T10:30:00Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-10T10:30:00Z",
            },
            users: {
              type: "array",
              items: { $ref: "#/components/schemas/User" },
            },
            PasswordToken: {
              type: "array",
              items: { $ref: "#/components/schemas/PasswordToken" },
            },
          },
          example: {
            id: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            name: "Finecore",
            domain: "finecore.co",
            apiKey: "fc_live_3kj2h2j3h2jh23h23jh",
            status: "ACTIVE",
            createdAt: "2025-01-01T10:30:00Z",
            updatedAt: "2025-01-10T10:30:00Z",
          },
        },

        User: {
          type: "object",
          required: [
            "id",
            "tenant_id",
            "email",
            "password",
            "role",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            },
            tenant_id: {
              type: "string",
              format: "uuid",
              example: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            },
            tenant: { $ref: "#/components/schemas/Tenant" },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            name: { type: "string", nullable: true, example: "John Doe" },
            password: {
              type: "string",
              example: "$2b$10$encryptedpasswordhash",
            },
            phone: {
              type: "string",
              nullable: true,
              example: "+2348012345678",
            },
            role: { $ref: "#/components/schemas/Role" },
            agreed: { type: "boolean", nullable: true, example: true },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-02T14:00:00Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-08T08:00:00Z",
            },
            PasswordToken: {
              type: "array",
              items: { $ref: "#/components/schemas/PasswordToken" },
            },
            RefreshToken: {
              type: "array",
              items: { $ref: "#/components/schemas/RefreshToken" },
            },
          },
          example: {
            id: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            tenant_id: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            email: "user@example.com",
            name: "John Doe",
            role: "USER",
            phone: "+2348012345678",
            agreed: true,
            createdAt: "2025-01-02T14:00:00Z",
            updatedAt: "2025-01-08T08:00:00Z",
          },
        },

        PasswordToken: {
          type: "object",
          required: [
            "id",
            "tokenHash",
            "user_id",
            "tenant_id",
            "expiresAt",
            "createdAt",
            "used",
          ],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "d902f65a-30a7-4b61-bf80-3fbd6285b1e2",
            },
            tokenHash: {
              type: "string",
              example: "bb8e3faf700c1f2cabfa55d27e51f3c8",
            },
            user_id: {
              type: "string",
              format: "uuid",
              example: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            },
            user: { $ref: "#/components/schemas/User" },
            tenant_id: {
              type: "string",
              format: "uuid",
              example: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            },
            tenant: { $ref: "#/components/schemas/Tenant" },
            expiresAt: {
              type: "string",
              format: "date-time",
              example: "2025-02-01T00:00:00Z",
            },
            used: { type: "boolean", example: false },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-20T10:10:00Z",
            },
          },
          example: {
            id: "d902f65a-30a7-4b61-bf80-3fbd6285b1e2",
            tokenHash: "bb8e3faf700c1f2cabfa55d27e51f3c8",
            user_id: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            tenant_id: "88d3d92e-4613-44f9-bb60-78d8185e2c36",
            expiresAt: "2025-02-01T00:00:00Z",
            used: false,
            createdAt: "2025-01-20T10:10:00Z",
          },
        },

        RefreshToken: {
          type: "object",
          required: ["id", "token", "userId", "expiresAt", "createdAt"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "1ed04c98-cdd6-4a3d-bba1-55b4470ea23e",
            },
            token: { type: "string", example: "refresh_1h287rh2h3r2h32rh" },
            userId: {
              type: "string",
              format: "uuid",
              example: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            },
            user: { $ref: "#/components/schemas/User" },
            revoked: { type: "boolean", nullable: true, example: false },
            expiresAt: {
              type: "string",
              format: "date-time",
              example: "2025-03-01T00:00:00Z",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-10T00:00:00Z",
            },
          },
          example: {
            id: "1ed04c98-cdd6-4a3d-bba1-55b4470ea23e",
            token: "refresh_1h287rh2h3r2h32rh",
            userId: "a7c09c4c-e50a-4f2f-9f9f-4512a1c29eff",
            revoked: false,
            expiresAt: "2025-03-01T00:00:00Z",
            createdAt: "2025-01-10T00:00:00Z",
          },
        },

        Role: {
          type: "string",
          enum: ["OWNER", "ADMIN", "USER"],
          example: "USER",
        },

        TenantStatus: {
          type: "string",
          enum: ["ACTIVE", "EXPIRED", "DELETED", "OUTDATED", "ABANDONED"],
          example: "ACTIVE",
        },
      },
    },
    security: [{ apiKey: [] }],
  },
};
