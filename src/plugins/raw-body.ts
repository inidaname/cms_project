import fp from "fastify-plugin";

const rawBodyPlugin: PluginType = async (fastify) => {
  fastify.removeContentTypeParser("application/json");

  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      try {
        const text = body.toString();
        (req as any).rawBody = text;
        // Empty body (POST/DELETE with no payload) → null
        if (!text.trim()) {
          done(null, undefined);
          return;
        }
        done(null, JSON.parse(text));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
};

export default fp(rawBodyPlugin);
