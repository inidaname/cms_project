export {};

type FastifyJWT = import("@fastify/jwt").FastifyJwtNamespace<{
  jwtDecode: "securityJwtDecode";
  jwtSign: "securityJwtSign";
  jwtVerify: "securityJwtVerify";
}>;
declare module "fastify" {
  interface FastifyRequest {
    tenant: import("@prisma/client").Tenant | null;
  }
  interface FastifyInstance extends FastifyJWT {
    prisma: PrismaClientType;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    bcrypt: {
      hash: (password: string, saltRounds?: number) => Promise<string>;
      compare: (password: string, hash: string) => Promise<boolean>;
    };

    nodemailer: Transporter;
    requiredFields: ValidationPlugin;
    invalidFields: ValidationPlugin;
  }
}
