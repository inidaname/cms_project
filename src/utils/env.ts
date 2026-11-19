// Centralized environment access: provider configuration is selected from
// environment variables in one place so both runtimes fail consistently.
//
// - `requiredEnv`: missing in production is fatal (startup error); in
//   development it warns and returns undefined so local flows keep working.
// - `optionalEnv`: reads with no failure semantics (the caller decides how
//   missing configuration behaves).

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name];
}

export function requiredEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    if (isProduction()) {
      throw new Error(
        `${name} must be set when running in production. Refusing to continue without it.`,
      );
    }
    // Warn once per process per variable name.
    if (!(requiredEnv as any)._warned?.[name]) {
      console.warn(
        `[env] ${name} is not set; continuing with a development fallback where available.`,
      );
      (requiredEnv as any)._warned = { ...((requiredEnv as any)._warned ?? {}), [name]: true };
    }
  }
  return value;
}
