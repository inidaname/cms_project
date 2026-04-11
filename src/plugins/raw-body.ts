import fp from "fastify-plugin";

const rawBodyPlugin: PluginType = async (fastify) => {
  fastify.removeContentTypeParser("application/json");

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      try {
        (req as any).rawBody = body.toString();
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
};

export default fp(rawBodyPlugin);
