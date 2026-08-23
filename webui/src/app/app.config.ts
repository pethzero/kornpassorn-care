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
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';


export const appConfig: ApplicationConfig = {
  providers: [
  { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura },
      ripple: true,
      inputVariant: 'filled',
      zIndex: {
        modal: 1100,
        overlay: 2000, // ✅ รวม Toast ด้วย
        menu: 1000,
        tooltip: 1100,
      }
    }),
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
  provideNativeDateAdapter(),
  ]
};
