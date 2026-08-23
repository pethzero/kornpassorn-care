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

export function buildDeviceInfo(req: Request, extra?: Record<string, any>) {
  const uaParser = new UAParser.UAParser(req.headers['user-agent'] || '');
  const uaResult = uaParser.getResult();
  const ip = ((req.headers['x-forwarded-for'] as string) || req.ip || '').split(',')[0]?.trim() || null;

  const raw = String(req.headers['user-agent'] || null);
  const deviceInfo = {
    raw,
    ip,
    client: uaResult.browser?.name ? 'browser' : (uaResult.device?.type || 'unknown'),
    ua: {
      family: uaResult.browser?.name || null,
      version: uaResult.browser?.version || null,
      os: uaResult.os?.name || null,
      os_version: uaResult.os?.version || null,
      device: {
        vendor: uaResult.device?.vendor || null,
        brand: uaResult.device?.vendor || null,
        model: uaResult.device?.model || null,
      },
    },
    locale: req.headers['accept-language'] || null,
    fingerprint: (req.headers['x-client-fingerprint'] as string) || (extra && extra.fingerprint) || null,
    ...extra,
  };

  return cleanObject(deviceInfo) ?? null;
}