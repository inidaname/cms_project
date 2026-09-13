interface LoginType {
  email: string;
  password: string;
}

type PasswdTokenInput = InputType<import("@prisma/client").PasswordToken>;
type RefreshTokenInput = InputType<import("@prisma/client").RefreshToken>;

type Authhandler = (app: FastifyInstance) => {
  login: Handler<
    LoginType,
    {
      user: import("@prisma/client").User;
      accessToken: string;
      refreshToken: string;
    }
  >;
  register: Handler<
    Omit<UserInput, "tenant_id">,
    {
      user: import("@prisma/client").User;
      accessToken: string;
      refreshToken: string;
    }
  >;
  forgotPassword: Handler<{ email?: string; phone?: string }, null>;
  resetPassword: Handler<{ token: string; password: string }, null>;
  refreshToken: Handler<{ refreshToken: string }>;
  logout: Handler<{ refreshToken: string }>;
};
