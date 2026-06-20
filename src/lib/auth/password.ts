import bcrypt from "bcryptjs";

/**
 * Password + generic secret hashing (spec §15.1). bcrypt with cost 12 — never
 * store anything in readable form. Used for account passwords and for hashing
 * OTP codes / trusted-device tokens before they touch the database.
 */
const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_COST);
}

export function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
