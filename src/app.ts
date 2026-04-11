import { join } from "node:path";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import apiReference from "@scalar/fastify-api-reference";
import { swaggerOption } from "./utils/swagger";
import loadSchemas from "./helpers/load-schema";
import rawBodyPlugin from "./plugins/raw-body";
const schemaDir = join(__dirname, "./utils/schema");

const app: PluginType = async (fastify, opts) => {
  void fastify.register(rawBodyPlugin);

  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  fastify.register(cors, {
    origin: "*",
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH"],
  });

  fastify.register(fastifySwagger, swaggerOption);

  fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
    },
  });

  loadSchemas(fastify, schemaDir);

  fastify.register(apiReference, {
    routePrefix: "/documentation",
    configuration: {
      spec: {
        content: () => fastify.swagger(),
      },
      metaData: {
        title: "Commitly API reference Page",
        description: "My page page",
        ogDescription: "Still about my my page",
        ogTitle: "Page title",
        ogImage: "https://example.com/image.png",
        twitterCard: "summary_large_image",
      },
      hideModels: true,
      defaultHttpClient: {
        targetKey: "node",
        clientKey: "fetch",
      },
      authentication: {
        preferredSecurityScheme: [["bearerAuth", "apiKey"]],
      },
      theme: "bluePlanet",
    },
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
