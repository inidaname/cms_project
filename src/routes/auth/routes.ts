import { authHandler } from "../../core/auth/auth-handler";
import { AuthSchemas } from "../../core/auth/auth.schema";

const authUserRoutes: PluginType = async (app, opts) => {
  const handler = authHandler(app);

  app.post(
    "/register",
    {
      schema: AuthSchemas.register,
    },
    handler.register
  );
  app.post("/login", { schema: AuthSchemas.login }, handler.login);
  app.post(
    "/forgot-password",
    { schema: AuthSchemas.forgotPassword },
    handler.forgotPassword
  );
  app.post(
    "/reset-password",
    { schema: AuthSchemas.resetPassword },
    handler.resetPassword
  );
  app.post(
    "/refresh-token",
    { preHandler: [app.authenticate], schema: AuthSchemas.refreshToken },
    handler.refreshToken
  );
  app.post(
    "/logout",
    { preHandler: [app.authenticate], schema: AuthSchemas.logout },
    handler.logout
  );
};

export default authUserRoutes;
