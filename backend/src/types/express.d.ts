// types/express.d.ts
import 'express';

declare module 'express' {
  interface Request {
    csrfToken(): string;
  }
}
