import { FastifyInstance } from "fastify";

// loadSchemas.js
import fs from "fs";
import path from "path";

function loadSchemas(fastify: FastifyInstance, schemaDir: string) {
  const schemaFiles = fs.readdirSync(schemaDir);

  for (const file of schemaFiles) {
    if (file.endsWith(".js.map")) continue;

    const schemaPath = path.join(schemaDir, file);
    if (fs.statSync(schemaPath).isDirectory()) {
      loadSchemas(fastify, schemaPath);
      continue;
    }

    const schema = require(schemaPath);

    for (const key of Object.keys(schema)) {
      if (schema[key].$id) {
        fastify.addSchema(schema[key]);
      } else {
        fastify.log.warn(
          `Schema in ${file} does not have a valid $id property.`
        );
      }
    }
  }
}

export default loadSchemas;
