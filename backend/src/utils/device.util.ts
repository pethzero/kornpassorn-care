import { Request } from 'express';
import UAParser = require('ua-parser-js');

export function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const a = obj.map(v => cleanObject(v)).filter(v => v !== undefined);
    return a.length ? a : undefined;
  }
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const v = cleanObject(obj[k]);
      if (v !== undefined) out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return obj;
}

// IP จริงของผู้ใช้ — ผ่าน Cloudflare (Tunnel/Worker) req.ip จะเป็น IP ของ proxy ไม่ใช่ของผู้ใช้
// ใช้ฟังก์ชันนี้ที่เดียวทุกจุด (เดิมแต่ละที่อ่านเอง บางที่ใช้ req.ip ตรง ๆ)
export function getClientIp(req: Request): string | null {
  const header = (name: string) => {
    const v = req.headers[name];
    return (Array.isArray(v) ? v[0] : v) || '';
  };
  return header('cf-connecting-ip').trim() || header('x-forwarded-for').split(',')[0].trim() || req.ip || null;
}

// mobile / tablet / desktop — ใช้แยก "โทรศัพท์" กับ "โน้ตบุ๊ก" ที่ต่อ WiFi เดียวกัน (IP เหมือนกัน)
export function deviceType(ua: { device?: { type?: string }; os?: { name?: string } }): 'mobile' | 'tablet' | 'desktop' {
  const t = ua.device?.type;
  if (t === 'mobile' || t === 'tablet') return t;
  return /android|ios/i.test(ua.os?.name || '') ? 'mobile' : 'desktop';
}

// กันพลาด: เดิมเคยส่ง req.body ของหน้า login เข้ามาเป็น extra → รหัสผ่านถูกเก็บเป็นข้อความธรรมดาใน user_tokens.device_info
const SECRET_KEY = /pass|otp|token|secret|username/i;
function withoutSecrets(extra?: Record<string, any>) {
  return Object.fromEntries(Object.entries(extra ?? {}).filter(([k]) => !SECRET_KEY.test(k)));
}

export function buildDeviceInfo(req: Request, extra?: Record<string, any>) {
  const uaResult = new UAParser.UAParser(req.headers['user-agent'] || '').getResult();

  // เก็บเฉพาะที่หน้า "อุปกรณ์ที่เข้าสู่ระบบ" ใช้ (ข้อความ user-agent ดิบยังอยู่ใน login_logs ถ้าต้องตรวจย้อนหลัง)
  const deviceInfo = {
    ip: getClientIp(req),
    type: deviceType(uaResult),
    ua: {
      family: uaResult.browser?.name || null,
      version: uaResult.browser?.version || null,
      os: uaResult.os?.name || null,
      os_version: uaResult.os?.version || null,
      device: {
        vendor: uaResult.device?.vendor || null,
        model: uaResult.device?.model || null,
      },
    },
    ...withoutSecrets(extra),
  };

  return cleanObject(deviceInfo) ?? null;
}

// user-agent ดิบ (เช่นใน login_logs) → สรุปอุปกรณ์แบบเดียวกับ describeDevice
export function describeUserAgent(raw?: string | null) {
  const r = new UAParser.UAParser(raw || '').getResult();
  return describeDevice({
    type: deviceType(r),
    ua: { family: r.browser?.name, version: r.browser?.version, os: r.os?.name, os_version: r.os?.version, device: r.device },
  });
}

// สรุปอุปกรณ์ให้หน้าเว็บแสดง (หน้า "อุปกรณ์ที่เข้าสู่ระบบ" + หน้า admin) — รองรับ deviceInfo รุ่นเก่าที่ไม่มี type
export function describeDevice(info: any) {
  const ua = info?.ua ?? {};
  const type = info?.type ?? deviceType({ os: { name: ua.os } });
  return {
    type,
    browser: [ua.family, ua.version?.split('.')[0]].filter(Boolean).join(' ') || null,
    os: [ua.os, ua.os_version].filter(Boolean).join(' ') || null,
    model: [ua.device?.vendor, ua.device?.model].filter(Boolean).join(' ') || null,
  };
}
