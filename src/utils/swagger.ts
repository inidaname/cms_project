export const swaggerOption: any = {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Possible CMS API",
      description:
        "Multi-tenant e-commerce API with authentication, product management, cart, checkout, and payment processing via Finecore.",
      version: "1.0.0",
      contact: {
        email: "hello@mainheart.co",
        name: "Mainheart Ltd",
        url: "https://www.mainheart.co",
      },
    },

    servers: [
      {
        url: "https://api.mainheart.co",
        description: "Production server",
      },
      {
        url: "https://staging.mainheart.co",
        description: "Staging server",
      },
      {
        url: "http://localhost:7373",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication endpoints (register, login, password reset)" },
      { name: "Users", description: "User management endpoints" },
      { name: "Tenants", description: "Tenant management and configuration" },
      { name: "Products", description: "Product CRUD, variations, and bundles" },
      { name: "Carts", description: "Shopping cart management" },
      { name: "Checkout", description: "Checkout and order management" },
      { name: "Payments", description: "Payment processing via Finecore (card, USSD, virtual account)" },
      { name: "Subscribers", description: "Email marketing subscribers and lists" },
      { name: "Webhooks", description: "Webhook endpoints for external services" },
      { name: "Admin", description: "Admin dashboard, analytics, team management, projects, settings, and audit logs" },
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
        Role: {
          type: "string",
          enum: ["OWNER", "ADMIN", "USER"],
          description: "User role for access control",
        },
        TenantStatus: {
          type: "string",
          enum: ["ACTIVE", "EXPIRED", "DELETED", "OUTDATED", "ABANDONED"],
          description: "Tenant account status",
        },
        ProductStatus: {
          type: "string",
          enum: ["Available", "OutOfStock", "Discontinued"],
          description: "Product availability status",
        },
        PaymentChannels: {
          type: "string",
          enum: ["Card", "Transfer", "Cash", "Other"],
          description: "Payment channel type",
        },
        PaymentStatus: {
          type: "string",
          enum: ["Success", "Failed", "Pending"],
          description: "Payment transaction status",
        },
        CartStatus: {
          type: "string",
          enum: ["Active", "Abandoned", "Checkedout"],
          description: "Cart status",
        },
        DeliveryType: {
          type: "string",
          enum: ["PICKUP", "DELIVERY", "SHIPPING"],
          description: "Delivery method",
        },
        DeliveryStatus: {
          type: "string",
          enum: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"],
          description: "Delivery tracking status",
        },
        SalesStatus: {
          type: "string",
          enum: ["Delivered", "Paid", "Returned", "Cancelled"],
          description: "Order/sales status",
        },
        SubscriberStatus: {
          type: "string",
          enum: ["ACTIVE", "UNSUBSCRIBED", "BOUNCED"],
          description: "Email subscriber status",
        },
        CampaignStatus: {
          type: "string",
          enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"],
          description: "Email campaign status",
        },
        EmailSendStatus: {
          type: "string",
          enum: ["PENDING", "SENT", "FAILED"],
          description: "Email send status",
        },
        VariationTypes: {
          type: "string",
          enum: ["Color", "Size", "Others"],
          description: "Product variation type",
        },

        Tenant: {
          type: "object",
          required: ["id", "name", "domain", "apiKey", "status", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            domain: { type: "string" },
            apiKey: { type: "string", description: "Unique API key for tenant access" },
            status: { $ref: "#/components/schemas/TenantStatus" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        User: {
          type: "object",
          required: ["id", "tenant_id", "email", "role", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid", description: "Tenant this user belongs to" },
            email: { type: "string", format: "email" },
            name: { type: "string", nullable: true as unknown as undefined },
            phone: { type: "string", nullable: true as unknown as undefined },
            agreed: { type: "boolean", nullable: true as unknown as undefined },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Product: {
          type: "object",
          required: ["id", "title", "price", "tenant_id", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            price: { type: "number", format: "double" },
            quantity: { type: "number", nullable: true as unknown as undefined },
            attributes: { type: "object", additionalProperties: true },
            variation: { type: "boolean" },
            tenant_id: { type: "string", format: "uuid" },
            status: { $ref: "#/components/schemas/ProductStatus" },
            isBundle: { type: "boolean" },
            min_items: { type: "integer", nullable: true as unknown as undefined },
            max_items: { type: "integer", nullable: true as unknown as undefined },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        ProductVariation: {
          type: "object",
          required: ["id", "product_id", "type", "value", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            product_id: { type: "string", format: "uuid" },
            value: { type: "string" },
            quantity: { type: "number", format: "double", nullable: true as unknown as undefined },
            price: { type: "number", format: "double" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Cart: {
          type: "object",
          required: ["id", "user_id", "tenant_id", "totalValue", "status", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            totalValue: { type: "number", format: "double" },
            status: { $ref: "#/components/schemas/CartStatus" },
            notes: { type: "string", nullable: true as unknown as undefined },
            recipientName: { type: "string", nullable: true as unknown as undefined },
            recipientPhone: { type: "string", nullable: true as unknown as undefined },
            deliveryAddress: { type: "string", nullable: true as unknown as undefined },
            deliveryType: { $ref: "#/components/schemas/DeliveryType" },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        CartItem: {
          type: "object",
          required: ["id", "product_id", "cart_id", "product_quantity", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            product_id: { type: "string", format: "uuid" },
            cart_id: { type: "string", format: "uuid" },
            product_quantity: { type: "number", format: "double" },
            unit_price: { type: "number", format: "double" },
            value: { type: "number", format: "double" },
            variation_id: { type: "string", format: "uuid", nullable: true as unknown as undefined },
            product: { $ref: "#/components/schemas/Product" },
            variation: { $ref: "#/components/schemas/ProductVariation", nullable: true as unknown as undefined },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Sales: {
          type: "object",
          required: ["id", "cart_id", "tenant_id", "user_id", "amount", "status", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            cart_id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            amount: { type: "number", format: "double" },
            status: { $ref: "#/components/schemas/SalesStatus" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Payment: {
          type: "object",
          required: ["id", "user_id", "tenant_id", "sales_id", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            channel: { $ref: "#/components/schemas/PaymentChannels" },
            amount: { type: "number", format: "double" },
            status: { $ref: "#/components/schemas/PaymentStatus" },
            reference: { type: "string", nullable: true as unknown as undefined, description: "Internal payment reference" },
            finecoreTransactionRef: { type: "string", nullable: true as unknown as undefined, description: "Finecore transaction reference" },
            authType: { type: "string", nullable: true as unknown as undefined, description: "Authentication type (OTP, 3DS)" },
            requiresAuth: { type: "boolean", default: false },
            user_id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            sales_id: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Delivery: {
          type: "object",
          required: ["id", "sales_id", "tenant_id", "address", "recipientName", "recipientPhone", "status", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            sales_id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            address: { type: "string" },
            recipientName: { type: "string" },
            recipientPhone: { type: "string" },
            trackingNumber: { type: "string", nullable: true as unknown as undefined },
            estimatedArrival: { type: "string", format: "date-time", nullable: true as unknown as undefined },
            notes: { type: "string", nullable: true as unknown as undefined },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Subscriber: {
          type: "object",
          required: ["id", "tenant_id", "email", "status", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string", nullable: true as unknown as undefined },
            status: { $ref: "#/components/schemas/SubscriberStatus" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        List: {
          type: "object",
          required: ["id", "tenant_id", "name", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            name: { type: "string" },
            subscriberCount: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Campaign: {
          type: "object",
          required: ["id", "tenant_id", "subject", "status", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            subject: { type: "string" },
            htmlBody: { type: "string" },
            textBody: { type: "string", nullable: true as unknown as undefined },
            scheduledAt: { type: "string", format: "date-time", nullable: true as unknown as undefined },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        FinecoreConfig: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            environment: { type: "string", enum: ["sandbox", "live"] },
            hasApiKey: { type: "boolean" },
            hasPublicKey: { type: "boolean" },
            hasWebhookSecret: { type: "boolean" },
          },
        },

        FinecoreCardPayment: {
          type: "object",
          properties: {
            transaction_reference: { type: "string" },
            requires_authentication: { type: "boolean" },
            auth_type: { type: "string", enum: ["OTP", "3DS"], nullable: true as unknown as undefined },
                next_action: { type: "string" },
            acs_url: { type: "string", nullable: true as unknown as undefined, description: "3DS redirect URL" },
          },
        },

        FinecoreUSSDPayment: {
          type: "object",
          properties: {
            bank_short_code: { type: "string" },
            reference: { type: "string" },
            transaction_reference: { type: "string" },
            response_code: { type: "string" },
          },
        },

        FinecoreVirtualAccount: {
          type: "object",
          properties: {
            account_name: { type: "string" },
            account_number: { type: "string" },
            bank_name: { type: "string" },
            provider: { type: "string" },
            amount: { type: "number" },
            validity_period_mins: { type: "integer", description: "Minutes until account expires" },
            expiresAt: { type: "string", format: "date-time" },
          },
        },

        FinecoreWebhook: {
          type: "object",
          properties: {
            event: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                reference: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                status: { type: "string", enum: ["COMPLETED", "PENDING", "FAILED"] },
                type: { type: "string", enum: ["CREDIT", "DEBIT"] },
                category: { type: "string" },
                created_at: { type: "string", format: "date-time" },
              },
            },
          },
        },

        Discount: {
          type: "object",
          required: ["id", "tenant_id", "title", "percentage", "active", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            title: { type: "string" },
            percentage: { type: "number", description: "Discount percentage" },
            active: { type: "boolean", default: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Notification: {
          type: "object",
          required: ["id", "user_id", "type", "title", "body", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["EMAIL", "PUSH", "SMS", "IN_APP"] },
            priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL" },
            title: { type: "string" },
            body: { type: "string" },
            data: { type: "object", additionalProperties: true },
            read: { type: "boolean", default: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        NotificationTemplate: {
          type: "object",
          required: ["id", "name", "type", "body", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            type: { type: "string", enum: ["EMAIL", "PUSH", "SMS", "IN_APP"] },
            subject: { type: "string" },
            body: { type: "string" },
            variables: { type: "array", items: { type: "string" } },
            active: { type: "boolean", default: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        AuditLog: {
          type: "object",
          required: ["id", "user_id", "tenant_id", "action", "entityType", "entityId", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "INVITE", "REMOVE", "TRANSFER"] },
            entityType: { type: "string", enum: ["USER", "PRODUCT", "ORDER", "PAYMENT", "SETTINGS", "TEAM", "PROJECT"] },
            entityId: { type: "string" },
            metadata: { type: "object", additionalProperties: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Settings: {
          type: "object",
          properties: {
            storeName: { type: "string" },
            storeLogo: { type: "string" },
            storeDescription: { type: "string" },
            contactEmail: { type: "string", format: "email" },
            contactPhone: { type: "string" },
            address: { type: "string" },
            timezone: { type: "string" },
            currency: { type: "string" },
            taxRate: { type: "number" },
            notificationPreferences: { type: "object", additionalProperties: true },
          },
        },

        Invitation: {
          type: "object",
          required: ["id", "tenant_id", "email", "role", "token", "status", "expiresAt", "createdAt"],
          properties: {
            id: { type: "string", format: "uuid" },
            tenant_id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { $ref: "#/components/schemas/Role" },
            token: { type: "string" },
            status: { type: "string", enum: ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"] },
            expiresAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        PaginationMetadata: {
          type: "object",
          properties: {
            total: { type: "integer", description: "Total number of items" },
            page: { type: "integer", description: "Current page number" },
            limit: { type: "integer", description: "Items per page" },
            totalPages: { type: "integer", description: "Total number of pages" },
            hasNextPage: { type: "boolean" },
            hasPrevPage: { type: "boolean" },
          },
        },

        PaginatedResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {},
            },
          },
        },

        BaseResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["success", "error", "warning"] },
            message: { type: "string" },
            code: { type: "string" },
            data: { type: "object", additionalProperties: true, nullable: true as unknown as undefined },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["error"] },
            message: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    security: [{ apiKey: [] }],
  },
};
