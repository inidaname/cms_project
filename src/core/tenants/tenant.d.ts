type TenantInput = InputType<import("@prisma/client").Tenant>;
type Tenant = InputType<import("@prisma/client").Tenant>;

interface OnboardTenantBody {
  storeName: string;
  email: string;
  password: string;
  domain?: string;
  name?: string;
  phone?: string;
  logoImageURL?: string | null;
}

interface OnboardTenantData {
  tenant: {
    id: string;
    name: string;
    logoImageURL: string | null;
    domain: string;
    apiKey: string;
  };
  user: import("@prisma/client").User;
  accessToken: string;
  refreshToken: string;
}

type TenantHandler = (app: FastifyInstance) => {
  onboardTenant: Handler<OnboardTenantBody, OnboardTenantData>;
  registerTenant: Handler<Omit<TenantInput, "apiKey">, Tenant>;
  updateTenant: Handler<Partial<TenantInput>, Tenant>;
  getTenant: Handler<void, Tenant>;
};
