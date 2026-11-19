// Strips credential-bearing fields from user records before they are placed
// in HTTP responses. Password hashes, token internals and provider secrets
// must never leave the application boundary.
type UserLike = { password?: string | null; [key: string]: unknown };

export function sanitizeUser<T extends UserLike>(user: T): Omit<T, "password"> {
  const { password, ...safe } = user;
  void password;
  return safe as Omit<T, "password">;
}

export function sanitizeUsers<T extends UserLike>(users: T[]): Array<Omit<T, "password">> {
  return users.map((user) => sanitizeUser(user));
}
