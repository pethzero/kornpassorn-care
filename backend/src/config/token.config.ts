export const parseBool = (v?: string) => String(v).toLowerCase() === 'true';
export const parseIntOr = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// token/settings
export const ADMIN_NEVER_EXPIRE = parseBool(process.env.ADMIN_NEVER_EXPIRE);
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '15m';
export const ADMIN_ACCESS_TOKEN_EXPIRES_IN = process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN ?? '0'; // '0' = permanent
export const DEFAULT_ACCESS_EXPIRES = ACCESS_TOKEN_EXPIRES_IN;