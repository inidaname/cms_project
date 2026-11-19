import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import StatusCode from "status-code-enum";
import { CASErrorCode, CASErrorMessage } from "../utils/enums";
import { isProduction, requiredEnv } from "../utils/env";

const jwtPlugin = fp(async (fastify, options) => {
  // Security: a missing JWT_SECRET must fail fast in production. The literal
  // fallback exists only for local development and is never used silently in
  // a production deployment.
  const JWT_SECRET = requiredEnv("JWT_SECRET");
  if (!JWT_SECRET && isProduction()) {
    throw new Error(
      "JWT_SECRET must be set when running in production. Refusing to start with an insecure fallback secret.",
    );
  }

  fastify.register(fastifyJwt, {
    secret: JWT_SECRET || "JWT_SECRET",
    sign: {
      expiresIn: "15m",
    },
    cookie: {
      cookieName: "refreshToken",
      signed: false,
    },
  });

  fastify.decorate("authenticate", async (request, reply) => {
    try {
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
