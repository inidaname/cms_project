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
    data: Pick<Partial<CartsInput>, "status" | "totalValue">
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
    const [data, total] = await this.prisma.$transaction([
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
    const productChecks = await Promise.all(
      data.map((item) =>
        this.products.isTenantProduct(tenant_id, item.product_id)
      )
    );

    const hasValidTenantProduct = productChecks.some((result) => result);

    if (!hasValidTenantProduct) {
      throw new Error("Invalid product for tenant");
    }

    // Compute item values
    const itemsWithComputedValue = data.map((item) => ({
      ...item,
      value: item.product_quantity * item.unit_price,
    }));

    const totalValue = itemsWithComputedValue.reduce(
      (sum, item) => sum + item.value,
      0
    );

    let existingCart: any = null;

    if (cart_id) {
      existingCart = await this.getCartById(cart_id, tenant_id);
    }

    const cart =
      !existingCart || existingCart.status !== "Active"
        ? await this.createCart({
            tenant_id,
            user_id,
            totalValue,
            deliveryAddress: "",
            deliveryType: "DELIVERY",
            notes: "",
            recipientName: "",
            recipientPhone: "",
          })
        : existingCart;

    return this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        totalValue:
          cart.totalValue < totalValue ? { increment: totalValue } : totalValue,
        cartItems: { create: data },
      },
      include: {
        _count: true,
        cartItems: true,
        sales: true,
        customer: true,
        tenant: true,
      },
    });
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
      throw {};
    }

    const newCartTotal = item.cart.totalValue - item.value;

    const newItemTotal = item.item.price * quantity;

    return await this.prisma.cartItems.update({
      where: { id, cart: { user_id, tenant_id } },
      data: {
        cart: { update: { totalValue: newCartTotal + newItemTotal } },
        product_quantity: quantity,
        value: newItemTotal,
        unit_price: item.item.price,
      },
    });
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

    const [_, deletedItem] = await this.prisma.$transaction([
      this.prisma.cartItems.update({
        where: {
          id: itemId,
          cart: { user_id, tenant_id, status: { not: "Checkedout" } },
        },
        data: { cart: { update: { totalValue: { decrement: item.value } } } },
      }),
      this.prisma.cartItems.delete({ where: { id: itemId } }),
    ]);

    return deletedItem;
  }
}
