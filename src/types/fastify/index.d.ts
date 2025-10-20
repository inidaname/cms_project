export {};

type FastifyJWT = import("@fastify/jwt").FastifyJwtNamespace<{
  jwtDecode: "securityJwtDecode";
  jwtSign: "securityJwtSign";
  jwtVerify: "securityJwtVerify";
}>;
declare module "fastify" {
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
