type UserInput = InputType<import("@prisma/client").User>;
type User = import("@prisma/client").User;

type UserHandler = (app: FastifyInstance) => {
  updateUser: Handler<UserInput, User, { user_id: string }>;
  deleteUser: Handler<void, boolean, { user_id: string }>;
  countTenantUsers: Handler<void, number>;
  getUserById: Handler<void, User, { user_id: string }>;
  getUsersByTenantId: Handler<
    void,
    User[],
    void,
    { page?: number; limit?: number; filter?: string }
  >;
};
