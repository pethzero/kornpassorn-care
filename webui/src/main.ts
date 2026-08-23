// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config'; // 👈 เรียก config ที่รวมทุกอย่างแล้ว

bootstrapApplication(App, appConfig);
