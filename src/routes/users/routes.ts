import { userHandler } from "../../core/users/user-handler";

const userRoutes: PluginType = async (app, opts) => {
  const handler = userHandler(app);

  app.addHook("onRequest", app.authenticate);

  app.get("/:user_id", handler.getUserById);
  app.delete("/:user_id", handler.deleteUser);
  app.patch("/:user_id", handler.updateUser);
  app.get("/tenant/", handler.getUsersByTenantId);
};

export default userRoutes;
