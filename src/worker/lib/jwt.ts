import { sign, verify } from "hono/jwt";

export interface JwtSignOptions {
  expiresIn?: string | number;
}

const EXPIRY_SECONDS: Record<string, number> = {
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 60 * 60,
  "12h": 12 * 60 * 60,
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
};

export function createJwt(secret: string) {
  return {
    sign: async <T extends Record<string, unknown>>(
      payload: T,
      options?: JwtSignOptions,
    ): Promise<string> => {
      const ttl =
        typeof options?.expiresIn === "number"
          ? options.expiresIn
          : options?.expiresIn
            ? EXPIRY_SECONDS[options.expiresIn] ?? 15 * 60
            : 15 * 60;
      return sign({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }, secret, "HS256");
    },
    verify: async <T extends Record<string, unknown>>(token: string): Promise<T> => {
      return (await verify(token, secret, "HS256")) as T;
    },
  };
}

export type JwtClient = ReturnType<typeof createJwt>;
