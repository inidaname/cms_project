export const includeSchema = {
  $id: "includesSchema",
  id: { type: "string", format: "uuid" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};
export const passwordToken = {
  $id: "passwordToken",
  description: "details about the password token",
  type: "object",
  properties: {
    token: { type: "string" },
    id: { type: "string", format: "uuid" },
    userid: { type: "string", format: "uuid" },
    status: { $ref: "success#" },
    expiresAt: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const staffData = {
  $id: "staffDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    User: { $ref: "userDataSchema#" },
    userId: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    position: { type: "string" },
    level: { type: "string" },
    Devices: { type: "array", items: { $ref: "deviceDataSchema#" } },
    Invoices: { type: "array", items: { $ref: "invoiceDataSchema#" } },
    Organization: { $ref: "organizationDataSchema#" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const userData = {
  $id: "userDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    phone: { type: "string" },
    fullName: { type: "string" },
    agreed: { type: "boolean" },
    Staff: { $ref: "staffDataSchema#" },
    Organization: { $ref: "organizationDataSchema#" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const invoiceDataSchema = {
  $id: "invoiceDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    Organization: { $ref: "organizationDataSchema#" },
    organizationId: { type: "string", format: "uuid" },
    Device: { $ref: "deviceDataSchema" },
    deviceId: { type: "string", format: "uuid" },
    Fee: {},
    feeTableId: { type: "string", format: "uuid" },
    Staff: { $ref: "staffDataSchema#" },
    staffId: { type: "string", format: "uuid" },
    Payments: {},
    amountToPay: { type: "number", format: "int" },
    type: {
      type: "string",
      enum: ["Calibration", "Charges", "Renewal", "Deposit"],
    },
    status: {
      type: "string",
      enum: ["Paid", "Pending"],
    },
    narration: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const manufacturerDataSchema = {
  $id: "manufacturerDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    Devices: { type: "array", items: { $ref: "deviceDataSchema#" } },
    Brands: { type: "array", items: { $ref: "brandDataSchema#" } },
    country: { type: "string" },
    address: { type: "string" },
    _count: {
      type: "object",
      properties: {
        Devices: { type: "number", format: "float" },
        Brands: { type: "number", format: "float" },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const brandDataSchema = {
  $id: "brandDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    name: { type: "string" },
    Devices: { type: "array", items: { $ref: "deviceDataSchema#" } },
    Manufacturer: { $ref: "manufacturerDataSchema#" },
    manufacturerId: { type: "string", format: "uuid" },
    _count: {
      type: "object",
      properties: {
        Devices: { type: "number", format: "float" },
      },
    },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const organization = {
  $id: "organizationDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    rcNumber: { type: "string" },
    User: { $ref: "userDataSchema#" },
    userId: { type: "string", format: "uuid" },
    Devices: { type: "array", items: { $ref: "deviceDataSchema#" } },
    Invoices: { type: "array", items: { $ref: "invoiceDataSchema#" } },
    Staff: { type: "array", items: { $ref: "staffDataSchema#" } },
    _count: {
      type: "object",
      properties: {
        Invoices: { type: "number", format: "float" },
        Devices: { type: "number", format: "float" },
        Staff: { type: "number", format: "float" },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const deviceData = {
  $id: "deviceDataSchema",
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    CreatedBy: { $ref: "staffDataSchema#" },
    staffId: { type: "string", format: "uuid" },
    Organization: { $ref: "organizationDataSchema#" },
    organizationId: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string" },
    Manufacturer: { $ref: "manufacturerDataSchema#" },
    manufacturerId: { type: "string", format: "uuid" },
    Brand: { $ref: "brandDataSchema#" },
    brandId: { type: "string", format: "uuid" },
    modelNomer: { type: "string" },
    serialNumber: { type: "string" },
    Invoices: { type: "array", items: { $ref: "invoiceDataSchema#" } },
    _count: {
      type: "object",
      properties: {
        Invoices: { type: "number", format: "float" },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const feeGroupData = {
  $id: "feeGroupData",
};
