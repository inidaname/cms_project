import { createScope, type ShimRouteEntry } from "../lib/fastify-shim";
import { lazyContext } from "../lib/detached-context";
import { authenticate } from "../middleware/check-tenant";

import authRoutes from "../../routes/auth/routes";
import tenantRoutes from "../../routes/tenants/routes";
import userRoutes from "../../routes/users/routes";
import productRoutes from "../../routes/product/routes";
import cartRoutes from "../../routes/carts/route";
import checkoutRoutes from "../../routes/checkout/routes";
import paymentRoutes from "../../routes/payments/routes";
import webhookRoutes from "../../routes/webhook/routes";
import adminRoutes from "../../routes/admin/routes";
import superAdminRoutes from "../../routes/super-admin/routes";

type RoutePlugin = (app: unknown, opts?: unknown) => Promise<void>;

const prefixByPlugin: [string, RoutePlugin][] = [
  ["/auth", authRoutes as RoutePlugin],
  ["/tenants", tenantRoutes as unknown as RoutePlugin],
  ["/users", userRoutes as unknown as RoutePlugin],
  ["/product", productRoutes as unknown as RoutePlugin],
  ["/carts", cartRoutes as unknown as RoutePlugin],
  ["/checkout", checkoutRoutes as unknown as RoutePlugin],
  ["/payments", paymentRoutes as unknown as RoutePlugin],
  ["/webhook", webhookRoutes as unknown as RoutePlugin],
  ["/admin", adminRoutes as unknown as RoutePlugin],
  ["/super-admin", superAdminRoutes as unknown as RoutePlugin],
];

export function buildRouteEntries(): ShimRouteEntry[] {
  const entries: ShimRouteEntry[] = [];
  for (const [prefix, plugin] of prefixByPlugin) {
    const scope = createScope({
      prisma: lazyContext.prisma,
      jwt: lazyContext.jwt,
      bcrypt: lazyContext.bcrypt,
      cache: lazyContext.cache,
      authenticate,
    });
    void plugin(scope, {});
    entries.push(...scope.entries(prefix));
  }
  return entries;
}
