// Generates a runnable Postman v2.1 collection from docs/contract/openapi.json.
// - One folder per operation tag (+ Setup folder with auth scripts)
// - Collection variables: base_url, api_key, access_token, refresh_token,
//   super_admin_token
// - x-api-key header on tenant routes; Bearer {{access_token}} where the
//   operation declares bearerAuth; /super-admin/* uses {{super_admin_token}}
// - Sample request bodies generated from the JSON schemas ($refs resolved)
// - Test scripts on login/refresh endpoints capture tokens automatically
const fs = require("fs");

const doc = require("./openapi.json");

const UUID = "9f1c2b34-5a67-4c89-a0de-1f2b3c4d5e6f";

function sampleFromSchema(schema, schemas, depth = 0) {
  if (!schema || depth > 6) return {};
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/components\/schemas\//, "");
    return sampleFromSchema((schemas || {})[name], schemas, depth + 1);
  }
  if (schema.allOf) {
    return schema.allOf.reduce(
      (acc, s) => Object.assign(acc, sampleFromSchema(s, schemas, depth + 1)),
      {},
    );
  }
  if (schema.oneOf) return sampleFromSchema(schema.oneOf[0], schemas, depth + 1);
  if (schema.type === "object" || schema.properties) {
    const out = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      if (v && v.readOnly) continue;
      out[k] = sampleFromSchema(v, schemas, depth + 1);
    }
    return out;
  }
  if (schema.type === "array") {
    return [sampleFromSchema(schema.items, schemas, depth + 1)];
  }
  if (schema.enum) return schema.enum[0];
  if (schema.nullable && (schema.type === undefined || schema.type === null)) return null;
  switch (schema.type) {
    case "uuid":
    case "string":
      return schema.format === "uuid" || schema.type === "uuid"
        ? UUID
        : schema.example !== undefined
          ? schema.example
          : "string";
    case "integer":
    case "number":
      return typeof schema.minimum === "number" && schema.minimum > 0
        ? schema.minimum
        : 0;
    case "boolean":
      return false;
    default:
      return "string";
  }
}

function sampleBody(op, schemas) {
  try {
    const content = op.requestBody?.content?.["application/json"];
    if (!content) return undefined;
    if (content.example !== undefined) return content.example;
    const body = sampleFromSchema(content.schema, schemas);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      // Sensible defaults for the most common flags
      if (typeof body.password === "string") body.password = "super-secret-123";
      if (typeof body.token === "string") body.token = "REPLACE_WITH_TOKEN";
    }
    return body;
  } catch {
    return undefined;
  }
}

// Runtime truth from src/plugins/check-tenant.ts (PUBLIC_ROUTES) — the
// per-route `security` fields understate the middleware.
const PUBLIC_ROUTES = new Set([
  "/docs",
  "/docs/json",
  "/health",
  "/ping",
  "/documentation",
  "/webhook/finecore",
  "/tenants/onboard",
  "/super-admin/login",
  "/super-admin/refresh-token",
  "/admin/team/invite/accept",
]);

function needsApiKey(path, op) {
  if (PUBLIC_ROUTES.has(path)) return false;
  if (path.startsWith("/super-admin")) return false;
  return true;
}

function needsBearer(op) {
  const security = op.security ?? doc.security;
  if (!security) return false;
  return security.some((s) => "bearerAuth" in s);
}

function pathWithVars(path) {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

const foldersByName = new Map();
function folderFor(tag) {
  if (!foldersByName.has(tag)) {
    foldersByName.set(tag, { name: tag, item: [] });
  }
  return foldersByName.get(tag);
}

// Setup folder first: auth flows that fill collection variables.
const setupFolder = {
  name: "Setup",
  description:
    "Run these first. Login requests automatically store tokens in collection variables.",
  item: [
    {
      name: "Tenant — Login (sets access_token)",
      request: {
        method: "POST",
        header: [
          { key: "x-api-key", value: "{{api_key}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        url: { raw: "{{base_url}}/auth/login", host: ["{{base_url}}"], path: ["auth", "login"] },
        body: {
          mode: "raw",
          raw: JSON.stringify({ email: "owner@example.test", password: "super-secret-123" }),
        },
        description:
          "Authenticate a tenant user. Requires the tenant's API key. Sets `access_token` and `refresh_token`.",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "if (pm.response.code === 200) {",
              "  const data = pm.response.json().data;",
              "  pm.collectionVariables.set('access_token', data.accessToken);",
              "  pm.collectionVariables.set('refresh_token', data.refreshToken);",
              "}",
            ],
          },
        },
      ],
    },
    {
      name: "Tenant — Register (sets access_token)",
      request: {
        method: "POST",
        header: [
          { key: "x-api-key", value: "{{api_key}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        url: { raw: "{{base_url}}/auth/register", host: ["{{base_url}}"], path: ["auth", "register"] },
        body: {
          mode: "raw",
          raw: JSON.stringify({
            email: "newuser@example.test",
            password: "super-secret-123",
            name: "New User",
          }),
        },
        description: "Register a user for the tenant (first user of a tenant becomes OWNER).",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "if (pm.response.code === 201) {",
              "  const data = pm.response.json().data;",
              "  pm.collectionVariables.set('access_token', data.accessToken);",
              "  pm.collectionVariables.set('refresh_token', data.refreshToken);",
              "}",
            ],
          },
        },
      ],
    },
    {
      name: "Tenant — Refresh token",
      request: {
        method: "POST",
        header: [
          { key: "x-api-key", value: "{{api_key}}" },
          { key: "Authorization", value: "Bearer {{access_token}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        url: { raw: "{{base_url}}/auth/refresh-token", host: ["{{base_url}}"], path: ["auth", "refresh-token"] },
        body: { mode: "raw", raw: JSON.stringify({ refreshToken: "{{refresh_token}}" }) },
        description: "Exchange a refresh token for a new access + refresh token pair (rotation: the old refresh token is invalidated).",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "if (pm.response.code === 200) {",
              "  const data = pm.response.json().data;",
              "  pm.collectionVariables.set('access_token', data.accessToken);",
              "  pm.collectionVariables.set('refresh_token', data.refreshToken);",
              "}",
            ],
          },
        },
      ],
    },
    {
      name: "Platform — Super admin login (sets super_admin_token)",
      request: {
        method: "POST",
        header: [{ key: "Content-Type", value: "application/json" }],
        url: { raw: "{{base_url}}/super-admin/login", host: ["{{base_url}}"], path: ["super-admin", "login"] },
        body: {
          mode: "raw",
          raw: JSON.stringify({ email: "superadmin@example.test", password: "super-secret-123" }),
        },
        description: "Platform login. No tenant API key. Sets `super_admin_token`.",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "if (pm.response.code === 200) {",
              "  const body = pm.response.json();",
              "  const data = body.data || body;",
              "  if (data.accessToken) pm.collectionVariables.set('super_admin_token', data.accessToken);",
              "  if (data.refreshToken) pm.collectionVariables.set('super_admin_refresh_token', data.refreshToken);",
              "}",
            ],
          },
        },
      ],
    },
  ],
};

for (const [path, ops] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    if (!op || typeof op !== "object" || !op.responses) continue;
    const tag = (op.tags && op.tags[0]) || "Other";
    const folder = folderFor(tag === "User" ? "Users" : tag);

    const headers = [];
    if (needsApiKey(path, op)) {
      headers.push({ key: "x-api-key", value: "{{api_key}}" });
    }
    if (path.startsWith("/super-admin") && ![
      "/super-admin/login",
      "/super-admin/refresh-token",
    ].includes(path)) {
      headers.push({ key: "Authorization", value: "Bearer {{super_admin_token}}" });
    } else if (needsBearer(op)) {
      headers.push({ key: "Authorization", value: "Bearer {{access_token}}" });
    }

    const bodySample = sampleBody(op, doc.components?.schemas);
    if (bodySample !== undefined) {
      headers.push({ key: "Content-Type", value: "application/json" });
    }

    const query = [];
    for (const [qp, schema] of Object.entries(op.parameters
      ? Object.fromEntries(
          (op.parameters || [])
            .filter((p) => p.in === "query")
            .map((p) => [p.name, p.schema || {}]),
        )
      : {})) {
      query.push({ key: qp, value: String(sampleFromSchema(schema, doc.components?.schemas) ?? "") });
    }

    const request = {
      method: method.toUpperCase(),
      header: headers,
      url: {
        raw: `{{base_url}}${pathWithVars(path)}`,
        host: ["{{base_url}}"],
        path: path.replace(/^\//, "").split("/").map((seg) =>
          seg.replace(/\{([^}]+)\}/g, ":$1"),
        ),
        ...(query.length ? { query } : {}),
      },
      description: op.description || op.summary || "",
    };
    if (bodySample !== undefined) {
      request.body = { mode: "raw", raw: JSON.stringify(bodySample, null, 2) };
    }

    folder.item.push({ name: op.summary || `${method.toUpperCase()} ${path}`, request });
  }
}

const collection = {
  info: {
    name: "Possible CMS API",
    description: {
      type: "text/markdown",
      version: "1.0.0",
      content: [
        "Multi-tenant commerce and campaign CMS API.",
        "",
        "**Auth model**",
        "- Tenant routes: `x-api-key` (tenant identity + status) **and** a `Bearer` JWT belonging to that tenant.",
        "- Admin routes (`/admin/*`): additionally require an OWNER or ADMIN role token.",
        "- Super-admin routes (`/super-admin/*`): platform JWT only (no tenant API key).",
        "- Public: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/tenants/onboard`, `/admin/team/invite/accept`, `/webhook/finecore` (signature-verified), docs/health.",
        "",
        "**Environment variables**",
        "- `base_url` — e.g. http://localhost:7373",
        "- `api_key` — a tenant API key (created at onboarding or via super-admin impersonation)",
        "- `access_token`, `refresh_token` — set automatically by the Setup folder",
        "- `super_admin_token` — set by the platform login in Setup",
        "",
        "Generate this collection's companion OpenAPI document: `docs/contract/openapi.json`.",
      ].join("\n"),
    },
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    _postman_id: "b3c1d2e3-4f56-7890-abcd-ef0123456789",
  },
  auth: {
    type: "apikey",
    apikey: [
      { key: "in", value: "header" },
      { key: "key", value: "x-api-key" },
      { key: "value", value: "{{api_key}}" },
    ],
  },
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [],
      },
    },
  ],
  variable: [
    { key: "base_url", value: "http://localhost:7373" },
    { key: "api_key", value: "REPLACE_WITH_TENANT_API_KEY" },
    { key: "access_token", value: "" },
    { key: "refresh_token", value: "" },
    { key: "super_admin_token", value: "" },
    { key: "super_admin_refresh_token", value: "" },
  ],
  item: [
    setupFolder,
    ...[...foldersByName.values()],
  ],
};

fs.writeFileSync(
  "docs/contract/postman_collection.json",
  JSON.stringify(collection, null, 2) + "\n",
);

const total = collection.item.reduce(
  (n, f) => n + (f.item?.length || 0),
  0,
);
console.log("postman collection written:", total, "requests in", collection.item.length, "folders");
