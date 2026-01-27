import { join } from "node:path";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import apiReference from "@scalar/fastify-api-reference";
import { swaggerOption } from "./utils/swagger";
import loadSchemas from "./helpers/load-schema";
const schemaDir = join(__dirname, "./utils/schema");

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: PluginType = async (fastify, opts) => {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  fastify.register(cors, {
    origin: "*",
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH"],
  });

  fastify.register(fastifySwagger, swaggerOption);

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

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
