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

  async createCart(data: CartsInput) {
    return await this.getActiveCart(data.user_id, data.tenant_id) ||
      await this.prisma.cart.create({ data });
  }

  async editCart(
    id: string,
    tenant_id: string,
    data: Pick<Partial<CartsInput>, "status" | "totalValue">,
  ) {
    return await this.prisma.cart.update({ where: { id, tenant_id }, data });
  }

  async getCarts(
    tenant_id: string,
    page = 1,
    limit = 10,
    filter?: $Enums.CartStatus,
    user_id?: string,
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
      include: { _count: true, cartItems: true },
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
    data: Omit<CartItemsInput, "cart_id">[],
  ) {
    const itemsWithComputedValue = data.map((item) => ({
      ...item,
      value: item.product_quantity * item.unit_price,
    }));

    const totalValue = itemsWithComputedValue.reduce(
      (sum, item) => sum + item.value,
      0,
    );
    const cart = await this.createCart({
      status: "Active",
      tenant_id,
      user_id,
      totalValue,
    });

    return await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        totalValue: cart.totalValue < totalValue
          ? { increment: totalValue }
          : totalValue,
        cartItems: { create: data },
      },
    });
  }

  async getItemById(id: string) {
    return await this.prisma.cartItems.findUnique({
      where: { id },
      include: { items: true, variation: true, cart: true },
    });
  }

  async editItemQuantity(
    id: string,
    user_id: string,
    tenant_id: string,
    quantity: number,
  ) {
    if (quantity === 0) {
      return await this.removeItemsFromCart(user_id, tenant_id, id);
    }
    const item = await this.getItemById(id);

    if (!item) {
      return;
    }

    const newCartTotal = item.cart.totalValue - item.value;

    const newItemTotal = item.items.price * quantity;

    return await this.prisma.cartItems.update({
      where: { id, cart: { user_id, tenant_id } },
      data: {
        cart: { update: { totalValue: newCartTotal + newItemTotal } },
        product_quantity: quantity,
        value: newItemTotal,
        unit_price: item.items.price,
      },
    });
  }

  async getCartItems(cart_id: string, tenant_id: string) {
    return await this.prisma.cartItems.findMany({
      where: { cart_id, cart: { tenant_id } },
      include: { cart: true, items: true, variation: true },
    });
  }

  async removeItemsFromCart(
    user_id: string,
    tenant_id: string,
    itemId: string,
  ) {
    const item = await this.getItemById(itemId);

    if (!item) {
      return;
    }

    return await this.prisma.cart.update({
      where: {
        id: item.cart_id,
        user_id,
        tenant_id,
        status: { not: "Checkedout" },
      },
      data: {
        cartItems: { delete: { id: itemId } },
        totalValue: { decrement: item.value },
      },
    });
  }
}
