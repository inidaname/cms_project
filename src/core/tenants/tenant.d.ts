type TenantInput = InputType<import("@prisma/client").Tenant>;
type Tenant = InputType<import("@prisma/client").Tenant>;

type TenantHandler = (app: FastifyInstance) => {
  registerTenant: Handler<Omit<TenantInput, "apiKey">, Tenant>;
  updateTenant: Handler<Partial<TenantInput>, Tenant>;
  getTenant: Handler<void, Tenant>;
};
