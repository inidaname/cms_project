// AJV schemas for offering-domain configuration routes (prompt 9, phase 9b).
const offeringTypeShape = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    tenant_id: { type: "string", format: "uuid" },
    key: { type: "string" },
    name: { type: "string" },
    selectable: { type: "boolean" },
    scheduled: { type: "boolean" },
    participants: { type: "boolean" },
    deliverable: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const offeringTypeFlags = {
  selectable: { type: "boolean" },
  scheduled: { type: "boolean" },
  participants: { type: "boolean" },
  deliverable: { type: "boolean" },
};

const optionGroupShape = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    tenant_id: { type: "string", format: "uuid" },
    product_id: { type: "string", format: "uuid" },
    name: { type: "string" },
    required: { type: "boolean" },
    min_select: { type: "integer" },
    max_select: { type: "integer" },
    position: { type: "integer" },
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          label: { type: "string" },
          product_id: { type: "string", format: "uuid", nullable: true },
          price_delta: { type: "number" },
          active: { type: "boolean" },
        },
      },
    },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const OfferingSchemas = {
  createOfferingType: {
    summary: "Create Offering Type",
    description:
      "Define a tenant offering type. Behavior flags are generic primitives (selectable/scheduled/participants/deliverable), not industry concepts.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    body: {
      type: "object",
      required: ["key", "name"],
      properties: {
        key: { type: "string", minLength: 1, maxLength: 64 },
        name: { type: "string", minLength: 1, maxLength: 128 },
        ...offeringTypeFlags,
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: offeringTypeShape,
        },
      },
    },
  },

  listOfferingTypes: {
    summary: "List Offering Types",
    description: "List the tenant's offering types.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array", items: offeringTypeShape },
        },
      },
    },
  },

  getOfferingType: {
    summary: "Get Offering Type",
    description: "Get a single tenant offering type.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: offeringTypeShape,
        },
      },
    },
  },

  updateOfferingType: {
    summary: "Update Offering Type",
    description: "Update a tenant offering type (flags, key, or name).",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        key: { type: "string", minLength: 1, maxLength: 64 },
        name: { type: "string", minLength: 1, maxLength: 128 },
        ...offeringTypeFlags,
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

  deleteOfferingType: {
    summary: "Delete Offering Type",
    description: "Delete a tenant offering type.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
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

  createOptionGroup: {
    summary: "Create Option Group",
    description:
      "Add a configurable option group to a product (min/max selection rules). Generalizes the configurable-selection primitive.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { product_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 128 },
        required: { type: "boolean" },
        min_select: { type: "integer", minimum: 0 },
        max_select: { type: "integer", minimum: 1 },
        position: { type: "integer" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: optionGroupShape,
        },
      },
    },
  },

  listOptionGroups: {
    summary: "List Option Groups",
    description: "List a product's option groups with their choices.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { product_id: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array", items: optionGroupShape },
        },
      },
    },
  },

  updateOptionGroup: {
    summary: "Update Option Group",
    description: "Update an option group's rules.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 128 },
        required: { type: "boolean" },
        min_select: { type: "integer", minimum: 0 },
        max_select: { type: "integer", minimum: 1 },
        position: { type: "integer" },
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

  deleteOptionGroup: {
    summary: "Delete Option Group",
    description: "Delete an option group (its choices are removed with it).",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
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

  addOptionChoice: {
    summary: "Add Option Choice",
    description:
      "Add a choice to an option group. An optional linked product ties stock/depletion to the choice; price_delta adjusts the line price.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { group_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      required: ["label"],
      properties: {
        label: { type: "string", minLength: 1, maxLength: 128 },
        product_id: { type: "string", format: "uuid" },
        price_delta: { type: "number" },
        active: { type: "boolean" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              label: { type: "string" },
              product_id: { type: "string", format: "uuid", nullable: true },
              price_delta: { type: "number" },
              active: { type: "boolean" },
            },
          },
        },
      },
    },
  },

  updateOptionChoice: {
    summary: "Update Option Choice",
    description: "Update an option choice (label, price, active, linked product).",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        label: { type: "string", minLength: 1, maxLength: 128 },
        product_id: { type: "string", format: "uuid", nullable: true },
        price_delta: { type: "number" },
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

  deleteOptionChoice: {
    summary: "Delete Option Choice",
    description: "Delete an option choice.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
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
