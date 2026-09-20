export type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CACHE: KVNamespace;
  [key: string]: unknown;
};

export interface ContextUser {
  id: string;
  userType?: string;
  tenant_id?: string;
  role?: string;
  [key: string]: unknown;
}

export interface ContextTenant {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  status: string;
  tenantFinecoreConfig?: unknown;
  tenantEmailConfig?: unknown;
  [key: string]: unknown;
}

export type WorkerEnv = { Bindings: Env; Variables: { user?: ContextUser; tenant?: ContextTenant } };
