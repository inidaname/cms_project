import bcrypt from "bcryptjs";

export const bcryptClient = {
  hash: async (password: string, saltRounds = 10): Promise<string> => {
    return bcrypt.hash(password, saltRounds);
  },
  compare: async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  },
};
