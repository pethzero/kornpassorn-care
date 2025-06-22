// src/app/app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        loggingInterceptor, // log ก่อน
        authInterceptor,    // แนบ token
        errorInterceptor    // ดัก error response
      ])
    )
  ]
};
