//   สำหรับ production — ใช้ relative path เพราะ frontend กับ backend จะถูก serve
//   ผ่าน origin เดียวกัน (reverse proxy ส่ง /api ไปที่ NestJS, ส่วนที่เหลือไปที่ไฟล์ static ของ Angular)
export const environment = {
  production: true,
  apiUrl: '/api',
};