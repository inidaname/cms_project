export const AdminAnalyticsSchemas = {
  getDashboard: {
    summary: "Get Dashboard Stats",
    description: "Get dashboard statistics including sales, revenue, users, and products",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["7d", "30d", "90d", "year"], default: "30d" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getRevenueAnalytics: {
    summary: "Get Revenue Analytics",
    description: "Get detailed revenue analytics grouped by period and channel",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        groupBy: { type: "string", enum: ["day", "week", "month"], default: "day" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getUserAnalytics: {
    summary: "Get User Analytics",
    description: "Get user statistics and top customers",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getProductAnalytics: {
    summary: "Get Product Analytics",
    description: "Get product statistics including sales and low stock items",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getAllStats: {
    summary: "Get All Stats",
    description: "Get complete overview of all tenant statistics",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getFullReport: {
    summary: "Get Full Report",
    description: "Get comprehensive report with optional date range filter",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};

export const ProjectSchemas = {
  createProject: {
    summary: "Create Project",
    description: "Create a new project within the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        settings: { type: "object" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getProjects: {
    summary: "List Projects",
    description: "Get all projects for the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        status: { type: "string", enum: ["ACTIVE", "ARCHIVED", "DELETED"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getProjectById: {
    summary: "Get Project",
    description: "Get a specific project by ID",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        project_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateProject: {
    summary: "Update Project",
    description: "Update a project",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        project_id: { type: "string", format: "uuid" },
      },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        settings: { type: "object" },
        status: { type: "string", enum: ["ACTIVE", "ARCHIVED", "DELETED"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  archiveProject: {
    summary: "Archive Project",
    description: "Archive a project",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        project_id: { type: "string", format: "uuid" },
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

  deleteProject: {
    summary: "Delete Project",
    description: "Soft delete a project",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        project_id: { type: "string", format: "uuid" },
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

export const TeamSchemas = {
  getTeamMembers: {
    summary: "List Team Members",
    description: "Get all team members for the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        role: { type: "string", enum: ["OWNER", "ADMIN", "USER"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getMemberById: {
    summary: "Get Team Member",
    description: "Get a specific team member by ID",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateMemberRole: {
    summary: "Update Member Role",
    description: "Update a team member's role",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
      },
    },
    body: {
      type: "object",
      required: ["role"],
      properties: {
        role: { type: "string", enum: ["ADMIN", "USER"] },
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

  removeMember: {
    summary: "Remove Team Member",
    description: "Remove a team member from the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
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

  inviteMember: {
    summary: "Invite Team Member",
    description: "Send an invitation to join the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["ADMIN", "USER"], default: "USER" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  acceptInvite: {
    summary: "Accept Invitation",
    description: "Accept a team invitation and create account",
    tags: ["Admin"],
    body: {
      type: "object",
      required: ["token", "name", "password"],
      properties: {
        token: { type: "string" },
        name: { type: "string" },
        password: { type: "string", minLength: 8 },
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

  getInvites: {
    summary: "List Pending Invites",
    description: "Get all pending team invitations",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  cancelInvite: {
    summary: "Cancel Invite",
    description: "Cancel a pending team invitation",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        invite_id: { type: "string", format: "uuid" },
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

export const SubscriberSchemas = {
  listSubscribers: {
    summary: "List Subscribers",
    description: "Get all email subscribers for the tenant",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createSubscriber: {
    summary: "Create Subscriber",
    description: "Add a new subscriber",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
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
          data: { type: "object" },
        },
      },
    },
  },

  bulkImportSubscribers: {
    summary: "Bulk Import Subscribers",
    description: "Import multiple subscribers at once",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["emails"],
      properties: {
        emails: { type: "array", items: { type: "string", format: "email" } },
        names: { type: "object" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateSubscriber: {
    summary: "Update Subscriber",
    description: "Update subscriber details",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        name: { type: "string" },
        status: { type: "string", enum: ["ACTIVE", "UNSUBSCRIBED", "BOUNCED"] },
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

  deleteSubscriber: {
    summary: "Delete Subscriber",
    description: "Remove a subscriber",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
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

export const ListSchemas = {
  listLists: {
    summary: "List Lists",
    description: "Get all subscriber lists",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createList: {
    summary: "Create List",
    description: "Create a new subscriber list",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
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
          data: { type: "object" },
        },
      },
    },
  },

  addSubscribersToList: {
    summary: "Add Subscribers to List",
    description: "Add multiple subscribers to a list",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["list_id", "subscriber_ids"],
      properties: {
        list_id: { type: "string", format: "uuid" },
        subscriber_ids: { type: "array", items: { type: "string", format: "uuid" } },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  removeSubscribersFromList: {
    summary: "Remove Subscribers from List",
    description: "Remove subscribers from a list",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["list_id", "subscriber_ids"],
      properties: {
        list_id: { type: "string", format: "uuid" },
        subscriber_ids: { type: "array", items: { type: "string", format: "uuid" } },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  deleteList: {
    summary: "Delete List",
    description: "Delete a subscriber list",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
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
};

export const CampaignSchemas = {
  listCampaigns: {
    summary: "List Campaigns",
    description: "Get all email campaigns",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createCampaign: {
    summary: "Create Campaign",
    description: "Create a new email campaign",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["subject", "htmlBody"],
      properties: {
        subject: { type: "string" },
        htmlBody: { type: "string" },
        textBody: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateCampaign: {
    summary: "Update Campaign",
    description: "Update a campaign",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
        subject: { type: "string" },
        htmlBody: { type: "string" },
        textBody: { type: "string" },
        status: { type: "string", enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"] },
        scheduledAt: { type: "string", format: "date-time" },
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

  sendCampaign: {
    summary: "Send Campaign",
    description: "Send a campaign to subscribers",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["campaign_id"],
      properties: {
        campaign_id: { type: "string", format: "uuid" },
        list_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  deleteCampaign: {
    summary: "Delete Campaign",
    description: "Delete a campaign",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        campaign_id: { type: "string", format: "uuid" },
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

export const ProductSchemas = {
  listProducts: {
    summary: "List Products",
    description: "Get all products",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createProduct: {
    summary: "Create Product",
    description: "Create a new product",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["title", "price"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        quantity: { type: "number" },
        attributes: { type: "object" },
        variation: { type: "boolean" },
        status: { type: "string", enum: ["Available", "OutOfStock", "Discontinued"] },
        isBundle: { type: "boolean" },
        min_items: { type: "integer" },
        max_items: { type: "integer" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateProduct: {
    summary: "Update Product",
    description: "Update a product",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
        title: { type: "string" },
        description: { type: "string" },
        price: { type: "number" },
        quantity: { type: "number" },
        attributes: { type: "object" },
        variation: { type: "boolean" },
        status: { type: "string", enum: ["Available", "OutOfStock", "Discontinued"] },
        isBundle: { type: "boolean" },
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

  deleteProduct: {
    summary: "Delete Product",
    description: "Mark a product as discontinued",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        product_id: { type: "string", format: "uuid" },
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

export const OrderSchemas = {
  listOrders: {
    summary: "List Orders",
    description: "Get all orders/sales",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  updateOrderStatus: {
    summary: "Update Order Status",
    description: "Update order status",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id", "status"],
      properties: {
        id: { type: "string", format: "uuid" },
        status: { type: "string", enum: ["Delivered", "Paid", "Returned", "Cancelled"] },
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

  updateDelivery: {
    summary: "Update Delivery",
    description: "Update delivery information",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
        status: { type: "string", enum: ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"] },
        address: { type: "string" },
        recipientName: { type: "string" },
        recipientPhone: { type: "string" },
        trackingNumber: { type: "string" },
        estimatedArrival: { type: "string", format: "date-time" },
        notes: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};

export const PaymentSchemas = {
  listPayments: {
    summary: "List Payments",
    description: "Get all payments",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  refundPayment: {
    summary: "Refund Payment",
    description: "Refund a payment",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
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

export const DiscountSchemas = {
  listDiscounts: {
    summary: "List Discounts",
    description: "Get all discounts",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createDiscount: {
    summary: "Create Discount",
    description: "Create a new discount",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["title", "percentage"],
      properties: {
        title: { type: "string" },
        percentage: { type: "number" },
        active: { type: "boolean", default: true },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateDiscount: {
    summary: "Update Discount",
    description: "Update a discount",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" },
        title: { type: "string" },
        percentage: { type: "number" },
        active: { type: "boolean" },
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

  toggleDiscount: {
    summary: "Toggle Discount",
    description: "Enable or disable a discount",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["id", "active"],
      properties: {
        id: { type: "string", format: "uuid" },
        active: { type: "boolean" },
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

  deleteDiscount: {
    summary: "Delete Discount",
    description: "Delete a discount",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        discount_id: { type: "string", format: "uuid" },
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

export const NotificationSchemas = {
  getNotifications: {
    summary: "List Notifications",
    description: "Get all notifications",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 20 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getUnreadCount: {
    summary: "Get Unread Count",
    description: "Get count of unread notifications",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  markNotificationRead: {
    summary: "Mark Notification Read",
    description: "Mark a notification as read",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["notification_id"],
      properties: {
        notification_id: { type: "string", format: "uuid" },
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

  markAllNotificationsRead: {
    summary: "Mark All Notifications Read",
    description: "Mark all notifications as read",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  sendNotification: {
    summary: "Send Notification",
    description: "Send a notification",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["user_id", "type", "title", "body"],
      properties: {
        user_id: { type: "string", format: "uuid" },
        type: { type: "string", enum: ["EMAIL", "PUSH", "SMS", "IN_APP"] },
        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"], default: "NORMAL" },
        title: { type: "string" },
        body: { type: "string" },
        data: { type: "object" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  notifyAllAdmins: {
    summary: "Notify All Admins",
    description: "Send notification to all admin users",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["title", "body"],
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        data: { type: "object" },
        type: { type: "string", enum: ["EMAIL", "PUSH", "IN_APP"], default: "IN_APP" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  triggerEventNotification: {
    summary: "Trigger Event Notification",
    description: "Trigger automatic notification for an event",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["event", "data"],
      properties: {
        event: { type: "string", enum: ["new_sale", "payment_received", "low_stock", "new_user", "campaign_sent"] },
        data: { type: "object" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  sendFromTemplate: {
    summary: "Send From Template",
    description: "Send notification using a template",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["templateName", "user_id"],
      properties: {
        templateName: { type: "string" },
        user_id: { type: "string", format: "uuid" },
        variables: { type: "object" },
        sendTo: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            push: { type: "boolean" },
            inApp: { type: "boolean" },
          },
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};

export const TemplateSchemas = {
  getTemplates: {
    summary: "List Templates",
    description: "Get all notification templates",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  createTemplate: {
    summary: "Create Template",
    description: "Create a notification template",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["name", "type", "body"],
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["EMAIL", "PUSH", "SMS", "IN_APP"] },
        subject: { type: "string" },
        body: { type: "string" },
        variables: { type: "array", items: { type: "string" } },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateTemplate: {
    summary: "Update Template",
    description: "Update a notification template",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["template_id"],
      properties: {
        template_id: { type: "string", format: "uuid" },
        name: { type: "string" },
        type: { type: "string", enum: ["EMAIL", "PUSH", "SMS", "IN_APP"] },
        subject: { type: "string" },
        body: { type: "string" },
        variables: { type: "array", items: { type: "string" } },
        active: { type: "boolean" },
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

export const PushTokenSchemas = {
  registerPushToken: {
    summary: "Register Push Token",
    description: "Register a device push token",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["token", "platform"],
      properties: {
        token: { type: "string" },
        platform: { type: "string", enum: ["ios", "android", "web"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  removePushToken: {
    summary: "Remove Push Token",
    description: "Remove a device push token",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string" },
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

export const PreferenceSchemas = {
  getNotificationPreferences: {
    summary: "Get Notification Preferences",
    description: "Get user notification preferences",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateNotificationPreferences: {
    summary: "Update Notification Preferences",
    description: "Update user notification preferences",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      properties: {
        emailNotifications: { type: "boolean" },
        pushNotifications: { type: "boolean" },
        smsNotifications: { type: "boolean" },
        inAppNotifications: { type: "boolean" },
        notifyOnSale: { type: "boolean" },
        notifyOnPayment: { type: "boolean" },
        notifyOnLowStock: { type: "boolean" },
        notifyOnNewUser: { type: "boolean" },
        notifyOnCampaign: { type: "boolean" },
        quietHoursStart: { type: "string" },
        quietHoursEnd: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};

export const AuditLogSchemas = {
  getAuditLogs: {
    summary: "List Audit Logs",
    description: "Get audit logs with optional filters",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 20 },
        user_id: { type: "string", format: "uuid" },
        action: { type: "string", enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "INVITE", "REMOVE", "TRANSFER"] },
        entityType: { type: "string", enum: ["USER", "PRODUCT", "ORDER", "PAYMENT", "SETTINGS", "TEAM", "PROJECT"] },
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  getEntityHistory: {
    summary: "Get Entity History",
    description: "Get the audit history for a specific entity",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        entityType: { type: "string" },
        entityId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array" },
        },
      },
    },
  },

  getUserActivity: {
    summary: "Get User Activity",
    description: "Get audit logs for a specific user",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: {
        user_id: { type: "string", format: "uuid" },
      },
    },
    querystring: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 20 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};

export const SettingsSchemas = {
  getSettings: {
    summary: "Get Settings",
    description: "Get tenant settings",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },

  updateSettings: {
    summary: "Update Settings",
    description: "Update tenant settings",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
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
        notificationPreferences: { type: "object" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "object" },
        },
      },
    },
  },
};
