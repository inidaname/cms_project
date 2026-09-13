import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off/idempotent: recompute every cart's totalValue from its line items.
// Usage: npx tsx scripts/recalc-cart-totals.ts
async function main() {
  const carts = await prisma.cart.findMany({
    select: { id: true, totalValue: true },
  });

  let updated = 0;
  let unchanged = 0;

  for (const cart of carts) {
    const agg = await prisma.cartItems.aggregate({
      where: { cart_id: cart.id },
      _sum: { value: true },
    });

    const total = Math.round((agg._sum.value ?? 0) * 100) / 100;

    if (Number(cart.totalValue ?? 0) !== total) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalValue: total },
      });
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(
    `Done. Carts checked: ${carts.length}, updated: ${updated}, already correct: ${unchanged}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
