export const DeliverySchemas = {
  updateStatus: {
    tags: ["Delivery"],
    params: {
      type: "object",
      properties: { delivery_id: { type: "string", format: "uuid" } },
    },
    body: {
      type: "object",
      required: ["status"],
      properties: {
        status: {
          type: "string",
          enum: ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"],
        },
        trackingNumber: { type: "string" },
      },
    },
  },
  getDeliveryBySale: {
    tags: ["Delivery"],
    params: {
      type: "object",
      properties: { sales_id: { type: "string", format: "uuid" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          address: { type: "string" },
          recipientName: { type: "string" },
          estimatedArrival: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
