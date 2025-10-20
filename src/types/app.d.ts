type AutoloadPluginOptions = import("@fastify/autoload").AutoloadPluginOptions;
type FastifyServerOptions = import("fastify").FastifyServerOptions;

interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

type PluginType = import("fastify").FastifyPluginAsync<AppOptions>;

type PrismaClientType = import("../generated/prisma/index").PrismaClient;
type FastifyRedis = import("@fastify/redis").FastifyRedis;

interface NodemailerPluginOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

type Transporter = import("nodemailer").Transporter<
  import("nodemailer/lib/smtp-transport").SentMessageInfo
>;

declare module "@scalar/fastify-api-reference";

type ValidationPlugin = <T extends Record<string, any>>(
  schema: (keyof T)[],
) => MiddleHandler<T>;

type InputType<T> = Omit<T, "createdAt" | "updatedAt" | "id">;
