import { randomHex } from "./webcrypto";

export function generateApiKey(): string {
  return randomHex(32);
}
