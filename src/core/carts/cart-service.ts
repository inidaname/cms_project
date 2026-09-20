import { $Enums, Prisma } from "@prisma/client";
import { createPagination } from "../../utils/pagination";
import { ProductService } from "../product/product-service";

export class CartService {
  prisma;
  products: ProductService;

  constructor(prisma: PrismaClientType) {
    this.prisma = prisma;
    this.products = new ProductService(prisma);
  }

  async getActiveCart(user_id: string, tenant_id: string) {
    return await this.prisma.cart.findFirst({
      where: { user_id, tenant_id, status: "Active" },
      include: { _count: true, cartItems: true },
    });
  }

  // Single source of truth for the cart total: sum of all line values,
  // rounded to 2dp. Call right after the mutating statements.
  async recalculateCartTotal(cart_id: string) {
    const agg = await this.prisma.cartItems.aggregate({
      where: { cart_id },
      _sum: { value: true },
    });

    const total = Math.round((agg._sum.value ?? 0) * 100) / 100;

    return await this.prisma.cart.update({
      where: { id: cart_id },
      data: { totalValue: total },
      include: {
        _count: true,
        cartItems: true,
        sales: true,
        customer: true,
        tenant: true,
      },
    });
  }

  private async resolveStock(
    tenant_id: string,
    product_id: string,
    variation_id?: string | null
  ): Promise<{ available: number | null }> {
    if (variation_id) {
      const variation = await this.prisma.productVariation.findFirst({
        where: { id: variation_id, product: { id: product_id, tenant_id } },
      });
      return {
        available:
          variation?.quantity == null ? null : Number(variation.quantity),
      };
    }
    const product = await this.prisma.product.findFirst({
      where: { id: product_id, tenant_id },
    });
    return { available: product?.quantity == null ? null : Number(product.quantity) };
  }

  private async resolveStockMap(
    tenant_id: string,
    items: { product_id: string; variation_id?: string | null }[]
  ) {
    const map = new Map<string, { available: number | null }>();
    for (const item of items) {
      const key = `${item.product_id}:${item.variation_id ?? ""}`;
      if (!map.has(key)) {
        map.set(
          key,
          await this.resolveStock(tenant_id, item.product_id, item.variation_id)
        );
      }
    }
    return map;
  }

  async createCart(data: Omit<CartsInput, "status">) {
    return (
      (await this.getActiveCart(data.user_id, data.tenant_id)) ||
      (await this.prisma.cart.create({ data }))
    );
  }

  // async addBundleToCart(params: {
  //   tenant_id: string;
  //   user_id: string;
  //   cart_id?: string;
  //   product_id: string; // The "Box" itself
  //   product_quantity: number;
  //   selections: Array<{
  //     product_id: string;
  //     variation_id?: string;
  //     quantity: number;
  //   }>;
  // }) {
  //   const { tenant_id, user_id, product_id, product_quantity, selections } =
  //     params;

  //   return await this.prisma.$transaction(async (tx) => {
  //     // 1. Fetch the Parent Bundle (The Box/Plate)
  //     const bundleParent = await tx.product.findUnique({
  //       where: { id: product_id },
  //       include: { bundleComponents: true },
  //     });

  //     if (!bundleParent || !bundleParent.isBundle) {
  //       throw new Error("Product is not a bundle or does not exist.");
  //     }

  //     // 2. Validate Constraints (Min/Max Items)
  //     const totalSelectedItems = selections.reduce(
  //       (acc, s) => acc + s.quantity,
  //       0
  //     );
  //     if (
  //       bundleParent.min_items &&
  //       totalSelectedItems < bundleParent.min_items
  //     ) {
  //       throw new Error(
  //         `Minimum ${bundleParent.min_items} items required for this bundle.`
  //       );
  //     }
  //     if (
  //       bundleParent.max_items &&
  //       totalSelectedItems > bundleParent.max_items
  //     ) {
  //       throw new Error(
  //         `Maximum ${bundleParent.max_items} items allowed for this bundle.`
  //       );
  //     }

  //     // 3. Find or Create Cart
  //     let cart = params.cart_id
  //       ? await tx.cart.findUnique({ where: { id: params.cart_id } })
  //       : await tx.cart.create({
  //           data: { tenant_id, user_id, status: "Active" },
  //         });

  //     if (!cart) throw new Error("Cart not found.");

  //     // 4. Create the Parent CartItem (The Box)
  //     const parentCartItem = await tx.cartItems.create({
  //       data: {
  //         cart_id: cart.id,
  //         product_id: bundleParent.id,
  //         product_quantity: product_quantity,
  //         unit_price: bundleParent.price,
  //         value: bundleParent.price * product_quantity,
  //       },
  //     });

  //     // 5. Create Child CartItems (The contents) & Update Stock
  //     for (const selection of selections) {
  //       // Find component details to get the 'additionalPrice'
  //       const component = bundleParent.bundleComponents.find(
  //         (c) => c.child_id === selection.product_id
  //       );
  //       if (!component)
  //         throw new Error(
  //           `Product ${selection.product_id} is not an allowed component.`
  //         );

  //       const childProduct = await tx.product.findUnique({
  //         where: { id: selection.product_id },
  //       });
  //       if (!childProduct) throw new Error("Child product not found.");

  //       // Create the nested item
  //       await tx.cartItems.create({
  //         data: {
  //           cart_id: cart.id,
  //           product_id: selection.product_id,
  //           variation_id: selection.variation_id,
  //           product_quantity: selection.quantity,
  //           parent_item_id: parentCartItem.id, // Linking to the box
  //           unit_price: childProduct.price + component.additionalPrice,
  //           value:
  //             (childProduct.price + component.additionalPrice) *
  //             selection.quantity,
  //         },
  //       });

  //       // 6. Update Inventory for each item inside
  //       await tx.product.update({
  //         where: { id: selection.product_id },
  //         data: {
  //           quantity: { decrement: selection.quantity * product_quantity },
  //         },
  //       });
  //     }

  //     // Update Parent Box Inventory
  //     await tx.product.update({
  //       where: { id: product_id },
  //       data: { quantity: { decrement: product_quantity } },
  //     });

  //     // 7. Recalculate Cart Total
  //     const allItems = await tx.cartItems.findMany({
  //       where: { cart_id: cart.id },
  //     });
  //     const totalValue = allItems.reduce((acc, item) => acc + item.value, 0);

  //     return await tx.cart.update({
  //       where: { id: cart.id },
  //       data: { totalValue },
  //       include: { cartItems: { include: { childItems: true } } },
  //     });
  //   });
  // }

  // async updateLogistics(cart_id: string, data: any) {
  //   return await this.prisma.cart.update({
  //     where: { id: cart_id },
  //     data: {
  //       deliveryType: data.deliveryType,
  //       deliveryAddress: data.deliveryAddress,
  //       notes: data.notes,
  //       recipientName: data.recipientName,
  //       recipientPhone: data.recipientPhone,
  //     },
  //   });
  // }

  async editCart(
    id: string,
    user_id: string,
    tenant_id: string,
    data: Pick<Partial<CartsInput>, "status">
  ) {
    return await this.prisma.cart.update({
      where: { id, tenant_id, user_id },
      data,
    });
  }

  async getCarts(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: $Enums.CartStatus,
    user_id?: string
  ) {
    const whereClause: Prisma.CartWhereInput = {
      tenant_id,
      ...(user_id && { user_id }),
      ...(filter && { status: filter }),
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.cart.findMany({
        where: whereClause,
        include: { _count: true, cartItems: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.cart.count({ where: whereClause }),
    ]);

    return {
      data,
      metadata: createPagination(total, page, limit),
    };
  }

  async getCartById(id: string, tenant_id: string) {
    return await this.prisma.cart.findUnique({
      where: { id, tenant_id },
      include: {
        _count: true,
        cartItems: true,
        customer: true,
        sales: true,
        tenant: true,
      },
    });
  }

  async deleteCart(id: string, tenant_id: string, user_id?: string) {
    return await this.prisma.cart.delete({
      where: {
        id,
        tenant_id,
        ...(user_id && { user_id }),
        status: { not: "Checkedout" },
      },
    });
  }

  async addItemToCart(
    user_id: string,
    tenant_id: string,
    data: Omit<CartItemsInput, "cart_id" | "value">[],
    cart_id?: string
  ) {
    const productIds = [...new Set(data.map((item) => item.product_id))];
    const tenantProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenant_id },
    });

    const validIds = new Set(tenantProducts.map((p) => p.id));
    const hasValidTenantProduct = data.some((item) =>
      validIds.has(item.product_id)
    );

    if (!hasValidTenantProduct) {
      throw new Error("Invalid product for tenant");
    }

    // Resolve unit prices (product price, or the selected variation's price)
    const variationIds = data
      .map((item) => item.variation_id)
      .filter((id): id is string => Boolean(id));
    const variations = variationIds.length
      ? await this.prisma.productVariation.findMany({
          where: { id: { in: variationIds } },
        })
      : [];
    const variationPrice = new Map(
      variations.map((v) => [v.id, Number(v.price)])
    );
    const productPrice = new Map(
      tenantProducts.map((p) => [p.id, Number(p.price)])
    );

    // Only cart-item columns; strip client-only payloads like `selections`.
    const normalizedItems = data.map((item) => {
      const quantity = Number(item.product_quantity) || 0;
      const unitPrice: number = Number(
        (item.variation_id && variationPrice.get(item.variation_id)) ??
          productPrice.get(item.product_id) ??
          0
      );
      return {
        product_id: item.product_id,
        variation_id: item.variation_id ?? null,
        product_quantity: quantity,
        unit_price: unitPrice,
        value: quantity * unitPrice,
      };
    });

    let existingCart: any = null;

    const stockByProduct = await this.resolveStockMap(tenant_id, normalizedItems);

    if (cart_id) {
      existingCart = await this.getCartById(cart_id, tenant_id);
    }

    const cart =
      !existingCart || existingCart.status !== "Active"
        ? await this.createCart({
            tenant_id,
            user_id,
            totalValue: 0,
            deliveryAddress: "",
            deliveryType: "DELIVERY",
            notes: "",
            recipientName: "",
            recipientPhone: "",
          })
        : existingCart;

    // NOTE: interactive transactions are unreliable under the Neon serverless
    // driver (P2028s under load), so mutations run sequentially and the total
    // is always recomputed last from the line items — self-healing.
    for (const item of normalizedItems) {
      if (item.product_quantity <= 0) {
        continue;
      }

      const stock = stockByProduct.get(`${item.product_id}:${item.variation_id ?? ""}`);

      const existingLine = await this.prisma.cartItems.findFirst({
        where: {
          cart_id: cart.id,
          product_id: item.product_id,
          variation_id: item.variation_id ?? null,
        },
      });

      const existingQty = existingLine
        ? Number(existingLine.product_quantity)
        : 0;
      const requestedQty = existingQty + item.product_quantity;

      if (stock?.available != null && requestedQty > stock.available) {
        throw {
          statusCode: 400,
          status: "error",
          message:
            stock.available === 0
              ? "This item is out of stock"
              : `Only ${stock.available} of this item in stock`,
        };
      }

      if (existingLine) {
        // Merge: bump the existing line instead of duplicating
        const mergedQty = requestedQty;
        await this.prisma.cartItems.update({
          where: { id: existingLine.id },
          data: {
            product_quantity: mergedQty,
            unit_price: Number(item.unit_price),
            value: mergedQty * Number(item.unit_price),
          },
        });
      } else {
        await this.prisma.cartItems.create({
          data: {
            cart_id: cart.id,
            product_id: item.product_id! as string,
            variation_id: (item.variation_id ?? null) as string | null,
            product_quantity: Number(item.product_quantity),
            unit_price: Number(item.unit_price ?? 0),
            value: Number(item.value ?? 0),
          },
        });
      }
    }

    return await this.recalculateCartTotal(cart.id);
  }

  async getItemById(id: string, tenant_id: string, user_id?: string) {
    return await this.prisma.cartItems.findUnique({
      where: { id, cart: { tenant_id, user_id } },
      include: {
        item: true,
        variation: true,
        cart: true,
        _count: true,
        childItems: true,
        parentItem: true,
      },
    });
  }

  async editItemQuantity(
    id: string,
    user_id: string,
    tenant_id: string,
    quantity: number
  ) {
    if (quantity === 0) {
      return await this.removeItemsFromCart(user_id, tenant_id, id);
    }

    const item = await this.getItemById(id, tenant_id, user_id);

    if (!item) {
      throw {
        statusCode: 404,
        status: "error",
        message: "Cart item not found",
      };
    }

    if (item.cart.status === "Checkedout") {
      throw {
        statusCode: 400,
        status: "error",
        message: "Cannot edit a checked-out cart",
      };
    }

    // Stock cap on the new quantity (variation stock when line has a variation)
    const { available } = await this.resolveStock(
      tenant_id,
      item.product_id,
      item.variation_id
    );

    if (available != null && quantity > available) {
      throw {
        statusCode: 400,
        status: "error",
        message:
          available === 0
            ? "This item is out of stock"
            : `Only ${available} of this item in stock`,
      };
    }

    const variationPrice =
      item.variation_id && item.variation ? Number(item.variation.price) : null;
    const unitPrice =
      variationPrice ?? Number(item.item.price ?? 0);
    const value = quantity * unitPrice;

    await this.prisma.cartItems.update({
      where: { id, cart: { user_id, tenant_id } },
      data: {
        product_quantity: quantity,
        value,
        unit_price: unitPrice,
      },
    });

    return await this.recalculateCartTotal(item.cart_id);
  }

  async getCartItems(cart_id: string, tenant_id: string) {
    return await this.prisma.cartItems.findMany({
      where: { cart_id, cart: { tenant_id } },
      include: {
        cart: true,
        item: true,
        variation: true,
        _count: true,
        childItems: true,
        parentItem: true,
      },
    });
  }

  async removeItemsFromCart(
    user_id: string,
    tenant_id: string,
    itemId: string
  ) {
    const item = await this.getItemById(itemId, tenant_id, user_id);

    if (!item) {
      return;
    }

    if (item.cart.status === "Checkedout") {
      throw {
        statusCode: 400,
        status: "error",
        message: "Cannot edit a checked-out cart",
      };
    }

    await this.prisma.cartItems.delete({ where: { id: itemId } });

    return await this.recalculateCartTotal(item.cart_id);
  }
}
