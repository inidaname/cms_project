export {};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      userType: "Tenant" | "Admin" | "Sub Admin" | "User" | "refresh_token";
    };
    user: {
      id: string;
      userType: "Tenant" | "Admin" | "Sub Admin" | "User" | "refresh_token";
    };
  }
}
