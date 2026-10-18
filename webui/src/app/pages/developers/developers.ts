import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CodeSample {
  id: string;
  lang: string;
  code: string;
}

// เอกสาร API สำหรับผู้เชื่อมต่อภายนอก — เปิดได้โดยไม่ต้อง login (ไม่มีข้อมูลลับในหน้านี้)
// ตัวอย่างโค้ดเก็บเป็น string ใน TS เพื่อไม่ให้ { } ใน JSON ชนกับ template ของ Angular
@Component({
  selector: 'app-developers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './developers.html',
  styleUrls: ['./developers.scss'],
})
export class DevelopersComponent {
  readonly base = `${location.origin}/api/v1`;
  copied = '';
  active = 'overview';
  tokenLang: 'curl' | 'js' | 'python' = 'curl';

  readonly toc = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'quickstart', label: 'เริ่มใช้ใน 3 ขั้น' },
    { id: 'auth', label: 'ขอ Access Token' },
    { id: 'scopes', label: 'สิทธิ์ (Scopes)' },
    { id: 'appointments', label: 'GET /appointments' },
    { id: 'appointment-one', label: 'GET /appointments/{id}' },
    { id: 'clinic-hours', label: 'GET /clinic/hours' },
    { id: 'errors', label: 'Error' },
    { id: 'privacy', label: 'ข้อมูลส่วนบุคคล' },
  ];

  readonly scopes = [
    { key: 'appointments:read', desc: 'อ่านนัดหมาย — ชื่อย่อ + รหัสคนไข้เท่านั้น ไม่มีเบอร์โทร/เลขบัตร' },
    { key: 'clinic:read', desc: 'อ่านเวลาทำการและวันหยุดพิเศษของคลินิก' },
  ];

  readonly statuses = [
    { key: 'scheduled', desc: 'รอมาตามนัด' },
    { key: 'completed', desc: 'มาแล้ว / ให้บริการแล้ว' },
    { key: 'cancelled', desc: 'ยกเลิกนัด' },
    { key: 'no_show', desc: 'ไม่มาตามนัด' },
  ];

  readonly errors = [
    { code: '400', name: 'invalid_request / ข้อมูลไม่ถูกต้อง', when: 'ขาด client_id/secret, วันที่ผิดรูปแบบ, ช่วงวันที่เกิน 93 วัน' },
    { code: '401', name: 'invalid_client', when: 'client_id/secret ผิด, client ถูกปิดหรือหมดอายุ (ตอนขอ token)' },
    { code: '401', name: 'invalid_token', when: 'ไม่ส่ง token, token หมดอายุ, หรือ client ถูกปิดใช้งาน → ขอ token ใหม่' },
    { code: '403', name: 'ไม่มีสิทธิ์', when: 'client ไม่ได้รับ scope ที่ endpoint นั้นต้องการ' },
    { code: '404', name: 'ไม่พบข้อมูล', when: 'ไม่มีนัดหมาย id นั้น' },
  ];

  get tokenSamples(): Record<string, string> {
    return {
      curl: `curl -X POST ${this.base}/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "kpc_xxxxxxxxxxxxxxxx",
    "client_secret": "kpcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'`,
      js: `const res = await fetch("${this.base}/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "client_credentials",
    client_id: process.env.KPC_CLIENT_ID,
    client_secret: process.env.KPC_CLIENT_SECRET,
  }),
});
const { access_token, expires_in } = await res.json();`,
      python: `import os, requests

res = requests.post("${this.base}/oauth/token", json={
    "grant_type": "client_credentials",
    "client_id": os.environ["KPC_CLIENT_ID"],
    "client_secret": os.environ["KPC_CLIENT_SECRET"],
})
access_token = res.json()["access_token"]`,
    };
  }

  readonly tokenResponse = `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "appointments:read clinic:read"
}`;

  get listRequest(): string {
    return `curl "${this.base}/appointments?date_from=2026-10-17&date_to=2026-10-23&status=scheduled" \\
  -H "Authorization: Bearer <access_token>"`;
  }

  readonly listResponse = `{
  "data": [
    {
      "id": 12,
      "date": "2026-10-17",
      "start_time": "10:00",
      "end_time": "10:30",
      "service": "ทำแผล",
      "status": "scheduled",
      "patient": { "code": "000001", "display_name": "สมศรี ใ." }
    }
  ],
  "meta": { "date_from": "2026-10-17", "date_to": "2026-10-23", "count": 1 }
}`;

  get oneRequest(): string {
    return `curl "${this.base}/appointments/12" -H "Authorization: Bearer <access_token>"`;
  }

  get hoursRequest(): string {
    return `curl "${this.base}/clinic/hours" -H "Authorization: Bearer <access_token>"`;
  }

  readonly hoursResponse = `{
  "data": {
    "weekly": [
      { "day_of_week": 0, "is_closed": true,  "open_time": null,    "close_time": null,    "note": null },
      { "day_of_week": 1, "is_closed": false, "open_time": "08:00", "close_time": "17:00", "note": null }
    ],
    "special_days": [
      { "date": "2026-12-31", "is_closed": true, "open_time": null, "close_time": null, "note": "วันสิ้นปี" }
    ]
  }
}`;

  readonly errorResponse = `{ "error": "invalid_client", "error_description": "client_id หรือ client_secret ไม่ถูกต้อง หรือถูกปิดใช้งาน" }`;

  readonly reuseToken = `// เก็บ token ไว้ใช้ซ้ำจนใกล้หมดอายุ — อย่าขอ token ใหม่ทุก request
let cached = { token: null, expiresAt: 0 };

async function getToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch("${location.origin}/api/v1/oauth/token", { /* ...ตามตัวอย่างด้านบน */ });
  const data = await res.json();
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}`;

  async copy(text: string, id: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = id;
      setTimeout(() => (this.copied = ''), 1500);
    } catch {
      /* เบราว์เซอร์ไม่อนุญาต — ผู้ใช้เลือกข้อความเองได้ */
    }
  }

  go(id: string): void {
    this.active = id;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
