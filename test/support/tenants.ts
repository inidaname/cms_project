// Phase 1 tenant-isolation fixtures.
// Seeds two tenants (A and B) with owner and user accounts plus catalog data,
// and tears every created record down after the test run. All identifiers use
// an isolated prefix and a random suffix so reruns are safe.
import type { TestContext } from "node:test";

type PrismaClientLike = any;
type FastifyAppLike = any;

const PREFIX = "iso1-";

export type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;

export async function createTenantFixture(
  t: TestContext,
  app: FastifyAppLike,
) {
  const prisma: PrismaClientLike = app.prisma;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const tenantA = await prisma.tenant.create({
    data: {
      name: `${PREFIX}tenant-a-${suffix}`,
      domain: `${PREFIX}a-${suffix}.test`,
      apiKey: `${PREFIX}a-key-${suffix}`,
    },
  });
  const tenantB = await prisma.tenant.create({
    data: {
      name: `${PREFIX}tenant-b-${suffix}`,
      domain: `${PREFIX}b-${suffix}.test`,
      apiKey: `${PREFIX}b-key-${suffix}`,
    },
  });

  const ownerA = await prisma.user.create({
    data: {
      tenant_id: tenantA.id,
      email: `${PREFIX}owner-a-${suffix}@iso.test`,
      name: "Isolation Owner A",
      password: "not-used-in-isolation-tests",
      role: "OWNER",
      agreed: true,
    },
  });
  const userA = await prisma.user.create({
    data: {
      tenant_id: tenantA.id,
      email: `${PREFIX}user-a-${suffix}@iso.test`,
      name: "Isolation User A",
      password: "not-used-in-isolation-tests",
      role: "USER",
      agreed: true,
    },
  });
  const ownerB = await prisma.user.create({
    data: {
      tenant_id: tenantB.id,
      email: `${PREFIX}owner-b-${suffix}@iso.test`,
      name: "Isolation Owner B",
      password: "not-used-in-isolation-tests",
      role: "OWNER",
      agreed: true,
    },
  });

  const productA = await prisma.product.create({
    data: {
      tenant_id: tenantA.id,
      title: `${PREFIX}product-a-${suffix}`,
      description: "isolation fixture product A",
      price: 10,
    },
  });
  const variationA = await prisma.productVariation.create({
    data: {
      product_id: productA.id,
      type: "Color",
      value: "red",
      price: 11,
    },
  });

  const productB = await prisma.product.create({
    data: {
      tenant_id: tenantB.id,
      title: `${PREFIX}product-b-${suffix}`,
      description: "isolation fixture product B",
      price: 20,
    },
  });
  const variationB = await prisma.productVariation.create({
    data: {
      product_id: productB.id,
      type: "Color",
      value: "blue",
      price: 21,
    },
  });

  const subscriberB = await prisma.subscriber.create({
    data: {
      tenant_id: tenantB.id,
      email: `${PREFIX}sub-b-${suffix}@iso.test`,
    },
  });

  const tokenFor = (user: { id: string; tenant_id: string; role: string; email: string }) =>
    app.jwt.sign({
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
    });

  const tokens = {
    ownerA: tokenFor(ownerA),
    userA: tokenFor(userA),
    ownerB: tokenFor(ownerB),
  };

  t.after(async () => {
    const tenantIds = [tenantA.id, tenantB.id];
    const productIds = [productA.id, productB.id];

    // The Prisma engine occasionally returns transient errors ("engine not
    // yet connected" / empty response) during rapid sequential deletes in
    // test teardown; retry a few times and keep teardown best-effort so it
    // can never mask the test results.
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const del = async (fn: () => Promise<any>) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await fn();
        } catch {
          await wait(100);
        }
      }
    };

    await wait(100);

    await del(() =>
      prisma.cartItems.deleteMany({
        where: { OR: [{ product_id: { in: productIds } }, { cart: { tenant_id: { in: tenantIds } } }] },
      }),
    );
    await del(() => prisma.cart.deleteMany({ where: { tenant_id: { in: tenantIds } } }));
    await del(() =>
      prisma.productVariation.deleteMany({
        where: { product_id: { in: productIds } },
      }),
    );
    await del(() =>
      prisma.productComponent.deleteMany({
        where: { OR: [{ parent_id: { in: productIds } }, { child_id: { in: productIds } }] },
      }),
    );
    await del(() => prisma.product.deleteMany({ where: { id: { in: productIds } } }));
    await del(() =>
      prisma.listSubscriber.deleteMany({
        where: { OR: [{ subscriber: { tenant_id: { in: tenantIds } } }, { list: { tenant_id: { in: tenantIds } } }] },
      }),
    );
    await del(() => prisma.list.deleteMany({ where: { tenant_id: { in: tenantIds } } }));
    await del(() =>
      prisma.subscriber.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.emailSend.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.tenantFinecoreConfig.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.tenantEmailConfig.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.notification.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.notificationTemplate.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.tenantSettings.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.auditLog.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.project.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.discount.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() =>
      prisma.teamInvite.deleteMany({
        where: { tenant_id: { in: tenantIds } },
      }),
    );
    await del(() => prisma.user.deleteMany({ where: { tenant_id: { in: tenantIds } } }));
    await del(() => prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } }));
  });

  return {
    prisma,
    tenantA,
    tenantB,
    ownerA,
    userA,
    ownerB,
    productA,
    variationA,
    productB,
    variationB,
    subscriberB,
    suffix,
    tokens,
    // Convenience header builders for requests through app.inject.
    authA: { "x-api-key": tenantA.apiKey, authorization: `Bearer ${tokens.ownerA}` },
    authAUser: { "x-api-key": tenantA.apiKey, authorization: `Bearer ${tokens.userA}` },
    authB: { "x-api-key": tenantB.apiKey, authorization: `Bearer ${tokens.ownerB}` },
    // Cross pair: tenant-A token with tenant-B API key (and vice versa).
    crossAB: { "x-api-key": tenantB.apiKey, authorization: `Bearer ${tokens.ownerA}` },
    crossBA: { "x-api-key": tenantA.apiKey, authorization: `Bearer ${tokens.ownerB}` },
  };
};
