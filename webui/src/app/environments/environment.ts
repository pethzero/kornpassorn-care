//   สำหรับ dev — ใช้ relative path เหมือน production
//   ng serve ส่ง /api ต่อไปที่ NestJS (localhost:3000) ผ่าน proxy.conf.json
//   จึงใช้ได้ทั้งเปิดที่ http://localhost:4200 และผ่าน Cloudflare Tunnel (https://www.kronpatsroncare.com)
export const environment = {
  production: false,
  apiUrl: '/api',
};
