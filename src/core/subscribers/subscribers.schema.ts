const SubscriberSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    tenant_id: { type: "string" },
    email: { type: "string", format: "email" },
    name: { type: "string", nullable: true },
    status: { type: "string" },
    createdAt: { type: "string" },
  },
};

const ListSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    tenant_id: { type: "string" },
    name: { type: "string" },
    subscriberCount: { type: "integer" },
    createdAt: { type: "string" },
  },
};

const CampaignSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    tenant_id: { type: "string" },
    subject: { type: "string" },
    htmlBody: { type: "string" },
    textBody: { type: "string", nullable: true },
    status: { type: "string" },
    scheduledAt: { type: "string", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const PaginationMetadataSchema = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    limit: { type: "integer" },
    totalPages: { type: "integer" },
    hasNextPage: { type: "boolean" },
    hasPrevPage: { type: "boolean" },
  },
};

export const SubscriberSchemas = {
  createSubscriber: {
    summary: "Add Subscriber",
    description: "Add a new email subscriber to the tenant's list.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
        name: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: SubscriberSchema,
        },
      },
    },
  },

  getSubscribers: {
    summary: "List Subscribers",
    description: "Get paginated list of subscribers.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        filter: { type: "string", enum: ["ACTIVE", "UNSUBSCRIBED", "BOUNCED"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              data: { type: "array", items: SubscriberSchema },
              metadata: PaginationMetadataSchema,
            },
          },
        },
      },
    },
  },

  createList: {
    summary: "Create List",
    description: "Create a new email list for organizing subscribers.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: ListSchema,
        },
      },
    },
  },

  getLists: {
    summary: "List All Lists",
    description: "Get all subscriber lists for the tenant.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "array",
            items: ListSchema,
          },
        },
      },
    },
  },

  addSubscriberToList: {
    summary: "Add Subscriber to List",
    description: "Add an existing subscriber to a list.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      required: ["subscriber_id", "list_id"],
      properties: {
        subscriber_id: { type: "string", format: "uuid" },
        list_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },

  removeSubscriberFromList: {
    summary: "Remove Subscriber from List",
    description: "Remove a subscriber from a list.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      required: ["subscriber_id", "list_id"],
      properties: {
        subscriber_id: { type: "string", format: "uuid" },
        list_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },

  createCampaign: {
    summary: "Create Campaign",
    description: "Create a new email campaign.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    body: {
      type: "object",
      required: ["subject", "htmlBody"],
      properties: {
        subject: { type: "string" },
        htmlBody: { type: "string" },
        textBody: { type: "string" },
        list_id: { type: "string", format: "uuid", description: "Target list (optional)" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: CampaignSchema,
        },
      },
    },
  },

  getCampaigns: {
    summary: "List Campaigns",
    description: "Get all campaigns for the tenant.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              data: { type: "array", items: CampaignSchema },
              metadata: PaginationMetadataSchema,
            },
          },
        },
      },
    },
  },

  sendCampaign: {
    summary: "Send Campaign",
    description: "Send an email campaign to subscribers.",
    tags: ["Subscribers"],
    security: [{ bearerAuth: [], apiKey: [] }],
    params: {
      type: "object",
      required: ["campaign_id"],
      properties: {
        campaign_id: { type: "string", format: "uuid" },
      },
    },
    body: {
      type: "object",
      properties: {
        list_id: { type: "string", format: "uuid", description: "Optional: override campaign's target list" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};
