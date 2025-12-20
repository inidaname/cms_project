type UserInput = InputType<import("@prisma/client").User>;
type User = import("@prisma/client").User;

type UserHandler = (app: FastifyInstance) => {
  updateUser: Handler<UserInput, User>;
  deleteUser: Handler<void, boolean, { user_id: string }>;
  countTenantUsers: Handler<void, number>;
  getUserById: Handler<void, User>;
  getUsersByTenantId: PaginatedHandler<
    void,
    User,
    void,
    { page?: number; limit?: number; filter?: string }
  >;
};
