type UserInput = InputType<import("@prisma/client").User>;
type User = import("@prisma/client").User;
// Response user: password hashes must never be part of handler responses.
type SafeUser = Omit<import("@prisma/client").User, "password">;

type UserHandler = (app: FastifyInstance) => {
  updateUser: Handler<UserInput, SafeUser>;
  deleteUser: Handler<void, boolean, { user_id: string }>;
  countTenantUsers: Handler<void, number>;
  getUserById: Handler<void, SafeUser>;
  getUsersByTenantId: PaginatedHandler<
    void,
    SafeUser,
    void,
    { page?: number; limit?: number; filter?: string }
  >;
};
