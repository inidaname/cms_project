import { userHandler } from "../../core/users/user-handler";
import { UserSchema } from "../../core/users/user-schema";

const userRoutes: PluginType = async (app, opts) => {
  const handler = userHandler(app);

  app.addHook("onRequest", app.authenticate);

  app.get("/", { schema: UserSchema.getUserById }, handler.getUserById);
  // app.delete("/:user_id", handler.deleteUser);
  app.put("/", { schema: UserSchema.updateUser }, handler.updateUser);
  app.get("/tenant/", handler.getUsersByTenantId);
};

export default userRoutes;
