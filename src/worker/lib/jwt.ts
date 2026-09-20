import { createSigner, createVerifier, createDecoder } from "fast-jwt";

export interface JwtSignOptions {
  expiresIn?: string | number;
}

const DEFAULT_TTL_SECONDS = 15 * 60;

export function createJwt(secret: string) {
  const signer = createSigner({ key: secret, algorithm: "HS256" });
  const verifier = createVerifier({ key: secret, algorithms: ["HS256"] });
  const decoder = createDecoder();

  const ttlToSeconds = (expiresIn?: string | number): number => {
    if (typeof expiresIn === "number") return expiresIn;
    if (!expiresIn) return DEFAULT_TTL_SECONDS;
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) return DEFAULT_TTL_SECONDS;
    const n = Number(match[1]);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"];
    return n * unit;
  };

  return {
    sign: (payload: Record<string, unknown>, options?: JwtSignOptions): string => {
      const payloadWithExp = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + ttlToSeconds(options?.expiresIn),
        iat: Math.floor(Date.now() / 1000),
      };
      return signer(payloadWithExp as never);
    },
    verify: (token: string): Record<string, unknown> => {
      return verifier(token) as Record<string, unknown>;
    },
    decode: decoder,
  };
}

export type JwtClient = ReturnType<typeof createJwt>;
