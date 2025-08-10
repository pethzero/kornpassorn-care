// src/auth/guards/bearer-token.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class BearerTokenGuard extends AuthGuard('bearer-token') {
  constructor() {
    super();
  }
}
