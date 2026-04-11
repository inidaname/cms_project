import fp from "fastify-plugin";
import StatusCode from "status-code-enum";

interface RateLimitOptions {
  max?: number;
  timeWindow?: number;
  keyGenerator?: (request: any) => string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

declare module "fastify" {
  interface FastifyRequest {
    rateLimit: RateLimitInfo;
  }
}

const DEFAULT_MAX = 100;
const DEFAULT_TIME_WINDOW = 60;

const rateLimitPlugin = fp(
  async (fastify: any, opts?: RateLimitOptions) => {
    const max = opts?.max || DEFAULT_MAX;
    const timeWindow = opts?.timeWindow || DEFAULT_TIME_WINDOW;
    const keyGenerator =
      opts?.keyGenerator ||
      ((request: any) => {
        const apiKey = request.headers["x-api-key"];
        const userId = request.user?.id;
        const ip =
          request.headers["x-forwarded-for"] ||
          request.ip ||
          "unknown";

        if (apiKey) return `apikey:${apiKey}`;
        if (userId) return `user:${userId}`;
        return `ip:${ip}`;
      });

    fastify.addHook("preHandler", async (request: any, reply: any) => {
      const key = keyGenerator(request);
      const rateLimitKey = `ratelimit:${key}`;

      let current: number;
      let ttl: number;

      try {
        const redis = (fastify as any).cache?.redis;
        if (!redis) {
          return;
        }

        const multi = redis.multi();
        multi.incr(rateLimitKey);
        multi.ttl(rateLimitKey);
        const results = await multi.exec();

        current = results?.[0]?.[1] as number;
        ttl = results?.[1]?.[1] as number;

        if (current === 1 || ttl === -1) {
          await redis.expire(rateLimitKey, timeWindow);
          ttl = timeWindow;
        }

        if (current > max) {
          const resetTime = Math.floor(Date.now() / 1000) + ttl;

          reply.header("X-RateLimit-Limit", max);
          reply.header("X-RateLimit-Remaining", 0);
          reply.header("X-RateLimit-Reset", resetTime);
          reply.header("Retry-After", ttl);

          return reply.status(StatusCode.ClientErrorTooManyRequests).send({
            status: "error",
            code: "TEM6004",
            message: "Rate limit exceeded. Please try again later.",
            data: {
              limit: max,
              remaining: 0,
              resetTime,
              retryAfter: ttl,
            },
          });
        }

        const remaining = Math.max(0, max - current);
        const resetTime = Math.floor(Date.now() / 1000) + ttl;

        reply.header("X-RateLimit-Limit", max);
        reply.header("X-RateLimit-Remaining", remaining);
        reply.header("X-RateLimit-Reset", resetTime);

        request.rateLimit = {
          limit: max,
          remaining,
          resetTime,
        };
      } catch (error) {
        fastify.log.error({ error }, "Rate limit check failed");
      }
    });
  },
  {
    name: "rate-limit",
    dependencies: ["cache"],
  }
);

export default rateLimitPlugin;
