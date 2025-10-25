import fp from "fastify-plugin";
import bcrypt from "bcrypt";

const bcryptPlugin: PluginType = async (fastify, options) => {
  fastify.decorate("bcrypt", {
    hash: async (password, saltRounds = 10) => {
      return bcrypt.hash(password, saltRounds);
    },
    compare: async (password, hash) => {
      return bcrypt.compare(password, hash);
    },
  });
};

export default fp(bcryptPlugin);
