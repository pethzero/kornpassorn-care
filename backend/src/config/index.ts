import * as token from './token.config';
import * as database from './database.config';
export const Config = {
  token,
  database,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_SYNC: (process.env.DB_SYNC || 'true') === 'true',
  },
};
export type DeviceInfo = {
  raw?: string | null;
  ip?: string | null;
  client?: string | null;
  ua?: any;
  locale?: string | null;
  fingerprint?: string | null;
  [k: string]: any;
};