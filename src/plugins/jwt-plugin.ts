import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../utils/enums";

const jwtPlugin = fp(async (fastify, options) => {
  const JWT_SECRET = process.env.JWT_SECRET || "JWT_SECRET";
  fastify.register(fastifyJwt, {
    secret: JWT_SECRET, // @TODO: Update to use $public and $private key
  });

  fastify.decorate("authenticate", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      console.log("Authorization Header:", authHeader);
      await request.jwtVerify();
    } catch (err) {
      reply.status(StatusCode.ClientErrorUnauthorized).send({
        message: CASErrorMessage.UNAUTHORIZED_ACCESS,
        code: CASErrorCode.UNAUTHORIZED_ACCESS,
        status: "error",
      });
    }
  });
});

export default jwtPlugin;
