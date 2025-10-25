interface LoginType {
  email: string;
  password: string;
}

type Authhandler = (app: import("fastify").FastifyInstance) => {
  login: Handler<
    LoginType,
    import("@prisma/client").User
  >;
  register: Handler<
    UserInput,
    import("@prisma/client").User
  >;
};
