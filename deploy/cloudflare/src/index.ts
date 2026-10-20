// Worker หน้าด่าน: /api/* → Backend container · ที่เหลือ Cloudflare เสิร์ฟไฟล์หน้าเว็บเอง (assets ใน wrangler.jsonc)
import { Container } from '@cloudflare/containers';

interface Env {
  BACKEND: DurableObjectNamespace<Backend>;
  ASSETS: Fetcher;
  [key: string]: unknown;
}

export class Backend extends Container<Env> {
  defaultPort = 3100;
  // ไม่มีคนใช้ 30 นาที → container หลับ (ไม่เสียค่า CPU) — request แรกหลังหลับจะช้าไม่กี่วินาที
  sleepAfter = '30m';
  // ต้องออกเน็ตได้ — ฐานข้อมูลอยู่นอก Cloudflare
  enableInternet = true;

  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env);
    // ส่งทุก var/secret ที่เป็นข้อความ (DB_*, JWT_SECRET, ...) เข้า container เป็น environment variable
    this.envVars = Object.fromEntries(
      Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  override onError(error: unknown) {
    console.error('backend container error:', error);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    // ส่ง IP จริงของผู้ใช้ไปด้วย (backend อ่าน x-forwarded-for — ใช้บันทึกการ login / อุปกรณ์)
    const headers = new Headers(request.headers);
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) headers.set('x-forwarded-for', ip);

    // จำลองในเครื่อง (wrangler dev): ส่งไป backend ที่รันใน Docker เอง แทน Cloudflare container
    if (typeof env.LOCAL_BACKEND_URL === 'string' && env.LOCAL_BACKEND_URL) {
      const target = new URL(url.pathname + url.search, env.LOCAL_BACKEND_URL);
      return fetch(new Request(target, { method: request.method, headers, body: request.body, redirect: 'manual' }));
    }

    // instance เดียวชื่อ "main" — ทุก request ไปตัวเดียวกัน
    return env.BACKEND.getByName('main').fetch(new Request(request, { headers }));
  },
};
