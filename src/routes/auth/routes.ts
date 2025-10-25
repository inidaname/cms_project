import { authHandler } from "../../core/auth/auth-handler";

const authUserRoutes: PluginType = async (app, opts) => {
  const handler = authHandler(app);

  app.post("/register", handler.register);
  app.post("/login", handler.login);
  app.post("/forgot-password", handler.forgotPassword);
  app.post("/reset-password", handler.resetPassword);
  app.post(
    "/refresh-token",
    { preHandler: [app.authenticate] },
    handler.refreshToken,
  );
  app.post(
    "/logout",
    { preHandler: [app.authenticate] },
    handler.logout,
  );
};

export default authUserRoutes;
