export {};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      userType: "Tenant" | "Admin" | "Sub Admin" | "User" | "refresh_token";
      tenant_id?: string;
      role?: string;
      impersonated?: boolean;
      /** Unique-per-issuance claim on refresh tokens (rotation uniqueness). */
      jti?: string;
    };
    user: {
      id: string;
      userType: "Tenant" | "Admin" | "Sub Admin" | "User" | "refresh_token";
      tenant_id?: string;
      role?: string;
      impersonated?: boolean;
    };
  }
}
