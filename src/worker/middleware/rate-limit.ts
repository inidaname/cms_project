import type { Context, Next, MiddlewareHandler } from "hono";
import StatusCode from "status-code-enum";
import { CacheService } from "../../plugins/cache-kv";
import type { WorkerEnv } from "../types";

const DEFAULT_MAX = 100;
const ADMIN_MAX = 300;
const DEFAULT_TIME_WINDOW = 60;

interface RateLimitOptions {
  max?: number;
  timeWindow?: number;
}

export function rateLimit(opts?: RateLimitOptions): MiddlewareHandler<WorkerEnv> {
  return async (c: Context<WorkerEnv>, next: Next) => {
    if (!c.env.CACHE) return next();

    const url = new URL(c.req.url).pathname;
    const isAdminRoute = url.startsWith("/admin");
    const isAdmin = ["OWNER", "ADMIN"].includes((c.get("user") as any)?.role);
    const max = isAdminRoute && isAdmin ? ADMIN_MAX : opts?.max || DEFAULT_MAX;
    const timeWindow = opts?.timeWindow || DEFAULT_TIME_WINDOW;

    const user = c.get("user") as any;
    const userId = user?.id;
    const apiKey = c.req.header("x-api-key");
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const key = userId ? `user:${userId}` : apiKey ? `apikey:${apiKey}` : `ip:${ip}`;

    const cache = new CacheService(c.env.CACHE);
    const rateLimitKey = `ratelimit:${key}`;

    try {
      const current = await cache.incr(rateLimitKey, timeWindow);

      if (current > max) {
        const resetTime = Math.floor(Date.now() / 1000) + timeWindow;

        c.header("X-RateLimit-Limit", String(max));
        c.header("X-RateLimit-Remaining", "0");
        c.header("X-RateLimit-Reset", String(resetTime));
        c.header("Retry-After", String(timeWindow));

        return c.json(
          {
            status: "error",
            code: "TEM6004",
            message: "Rate limit exceeded. Please try again later.",
            data: { limit: max, remaining: 0, resetTime, retryAfter: timeWindow },
          },
          StatusCode.ClientErrorTooManyRequests as any,
        );
      }

      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", String(Math.max(0, max - current)));
    } catch {
      // fail open if cache is unavailable
    }

    return next();
  };
}
