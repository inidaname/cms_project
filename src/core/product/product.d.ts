type Product = InputType<import("@prisma/client").Product>;
type ProductVariation = InputType<import("@prisma/client").ProductVariation>;
type ProductInput = InputType<Product>;
type VariationInput = InputType<ProductVariation>;

type Producthanlder = (app: FastifyInstance) => {
  createProduct: Handler<
    { product: Omit<ProductInput, "tenant_id">; variation?: VariationInput },
    Product
  >;
  updateProduct: Handler<
    Omit<Partial<ProductInput>, "tenant_id">,
    Product,
    { product_id: string }
  >;
  getTenantProducts: Handler<
    void,
    Product[],
    void,
    { page?: number; limit?: number; filter?: string }
  >;
  getProductById: Handler<void, Product, { product_id: string }>;
  getVariationById: Handler<
    void,
    ProductVariation,
    { variation_id: string; product_id: string }
  >;
  getProductVariations: Handler<
    void,
    ProductVariation[],
    { product_id: string }
  >;
  createVariation: Handler<
    Omit<VariationInput, "product_id">,
    ProductVariation,
    { product_id: string }
  >;
  updateVariation: Handler<
    Partial<VariationInput>,
    ProductVariation,
    { variation_id: string; product_id: string }
  >;
  deleteProduct: Handler<void, Product, { product_id: string }>;
  deleteVariation: Handler<
    void,
    ProductVariation,
    { variation_id: string; product_id: string }
  >;
};
