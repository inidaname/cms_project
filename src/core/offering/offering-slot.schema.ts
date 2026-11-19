// AJV schemas for offering-slot routes (prompt 9, phase 9c).
const slotShape = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    tenant_id: { type: "string", format: "uuid" },
    product_id: { type: "string", format: "uuid" },
    startsAt: { type: "string" },
    endsAt: { type: "string" },
    capacity: { type: "integer", nullable: true },
    bookedCount: { type: "integer" },
    location: { type: "string", nullable: true },
    notes: { type: "string", nullable: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const slotDates = {
  startsAt: { type: "string", format: "date-time" },
  endsAt: { type: "string", format: "date-time" },
};

export const OfferingSlotSchemas = {
  createSlot: {
    summary: "Create Offering Slot",
    description:
      "Create a schedulable, capacity-limited slot for an offering (scheduling + capacity primitive).",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { product_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      required: ["startsAt", "endsAt"],
      properties: {
        ...slotDates,
        capacity: { type: "integer", minimum: 1, nullable: true },
        location: { type: "string", maxLength: 256 },
        notes: { type: "string", maxLength: 1024 },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: slotShape,
        },
      },
    },
  },

  listSlots: {
    summary: "List Offering Slots",
    description: "List an offering's slots. `?upcoming=true` filters to future slots.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { product_id: { type: "string", format: "uuid" } },
    },
    querystring: {
      type: "object",
      properties: {
        upcoming: { type: "string", enum: ["true", "false"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          data: { type: "array", items: slotShape },
        },
      },
    },
  },

  updateSlot: {
    summary: "Update Offering Slot",
    description: "Update a slot's dates, capacity, location, or notes.",
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    params: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      properties: {
        ...slotDates,
        capacity: { type: "integer", minimum: 1, nullable: true },
        location: { type: "string", maxLength: 256 },
        notes: { type: "string", maxLength: 1024 },
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

  deleteSlot: {
    summary: "Delete Offering Slot",
    description: "Delete a slot.",
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
