// src/app/app.config.ts

import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { routes } from './app.routes';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { csrfInterceptor } from './core/interceptors/csrf-interceptor';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
// import provideCharts + registerables
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideCharts(withDefaultRegisterables()),
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,  // log request
        authInterceptor,     // แนบ Authorization
        csrfInterceptor,     // แนบ X-CSRF-Token และ withCredentials
        errorInterceptor     // ดัก error response
      ])
    ),
  ]
};
