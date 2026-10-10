import argon2 from 'argon2';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export const argonPasswordHasher: PasswordHasher = {
  hash: (password) => argon2.hash(password),
  verify: (passwordHash, password) => argon2.verify(passwordHash, password),
};