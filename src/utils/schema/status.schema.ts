export const statusSuccessSchema = {
  $id: "success",
  type: "string",
  enum: ["success", "error", "warning"],
  example: "success",
};

export const statusErrorSchema = {
  $id: "error",
  type: "string",
  enum: ["success", "error", "warning"],
  example: "error",
};

export const statusWarningSchema = {
  $id: "warning",
  type: "string",
  enum: ["success", "error", "warning"],
  example: "warning",
};
