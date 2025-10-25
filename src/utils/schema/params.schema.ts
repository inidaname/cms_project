export const feeIdSchema = {
  $id: "feeIdParams",
  required: ["id"],
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "ID of the fee to fetch",
    },
  },
};
export const feeSubGroupIdSchema = {
  $id: "feeSubGroupIdParams",
  required: ["feeGroupId"],
  type: "object",
  properties: {
    feeGroupId: {
      type: "string",
      description: "ID of the Group to get it sub groups",
    },
  },
};
