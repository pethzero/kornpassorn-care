# Deploy ขึ้น Cloudflare

```
ผู้ใช้ ─▶ www.kronpatsroncare.com (Cloudflare)
            ├─ หน้าเว็บ Angular   → Workers Static Assets
            └─ /api/*            → Worker → Backend container (NestJS, backend/Dockerfile)
                                              └─▶ PostgreSQL ข้างนอก (Neon / Supabase)
```

Cloudflare ไม่มี PostgreSQL ให้ — ฐานข้อมูลต้องเช่าที่อื่น แนะนำ region **Singapore** (ใกล้ไทยสุด)

## สิ่งที่ต้องมี

- บัญชี Cloudflare ที่มีโดเมน `kronpatsroncare.com` (มีแล้ว) + แพ็กเกจ **Workers Paid** ($5/เดือน — Containers ใช้ไม่ได้ในแพ็กเกจฟรี)
- **Docker Desktop** เปิดอยู่ตอน deploy (wrangler ใช้ build image ของ backend)
- บัญชี Postgres บนคลาวด์ เช่น [Neon](https://neon.tech) หรือ [Supabase](https://supabase.com)
- เครื่องนี้มี PostgreSQL 17 (`pg_dump`, `psql`) อยู่แล้ว

## 1) สร้างฐานข้อมูลบนคลาวด์ + ย้ายข้อมูล PRD ขึ้นไป

ทำตาม [database/SUPABASE_README.md](../../database/SUPABASE_README.md) — สร้าง project (Singapore), ใส่ค่าใน `backend/.env.supabase`
แล้วกด task **☁️ Supabase: ย้ายข้อมูลจาก PRD ขึ้น (ครั้งแรก)** (สร้างตาราง + ใส่ข้อมูล + เทียบจำนวนแถวให้ครบ)

## 2) ติดตั้งและ login

```powershell
cd deploy/cloudflare
npm.cmd install
npx.cmd wrangler login
```

## 3) ใส่ความลับ (ทำครั้งเดียว — ค่าเก็บที่ Cloudflare ไม่อยู่ในโค้ด)

ใช้ค่าเดียวกับ `backend/.env.production` สำหรับ JWT/CSRF (ไม่งั้นทุกคนต้อง login ใหม่ และ API client token เดิมใช้ไม่ได้)
ส่วน DB_* ใช้ค่าเดียวกับ `backend/.env.supabase`:

```powershell
npx.cmd wrangler secret put DB_HOST
npx.cmd wrangler secret put DB_USER
npx.cmd wrangler secret put DB_PASS
npx.cmd wrangler secret put DB_NAME
npx.cmd wrangler secret put JWT_SECRET
npx.cmd wrangler secret put CSRF_SECRET
```

ค่าอื่นที่ไม่ใช่ความลับอยู่ใน `vars` ของ [wrangler.jsonc](wrangler.jsonc) แล้ว (`DB_SSL=true`, `DB_SYNC=false`, `DB_SSL_CA` ฯลฯ)
ใบรับรอง CA ของ Supabase (`backend/certs/supabase-ca.crt`) ถูกใส่ใน image ตอน build — ไม่ต้องตั้งเป็น secret
**ห้ามใส่ `DB_PASS` ใน `vars`** — จะขึ้น git และทับ secret

## จำลองในเครื่องก่อน deploy (Windows)

`wrangler dev` บน Windows จำลอง Cloudflare Container ไม่ได้ (ต้อง WSL) — จึงแบ่งเป็น 2 ส่วน:
Worker + หน้าเว็บ จำลองด้วย `wrangler dev` ส่วน `/api` ส่งไป backend ใน Docker ของเครื่องเอง

```powershell
# 1) build หน้าเว็บ production (ครั้งแรก/เมื่อแก้หน้าเว็บ)
cd deploy/cloudflare
npm run build:web

# 2) build + รัน backend ใน Docker (อีก terminal, จากโฟลเดอร์หลักของโปรเจกต์) — ใช้ DB DEV ของเครื่อง
docker build -t kornpassorn-backend backend
docker run --rm -p 3100:3100 --env-file backend/.env.dev `
  -e NODE_ENV=production -e PORT=3100 -e DB_HOST=host.docker.internal -e DB_SYNC=false `
  kornpassorn-backend

# 3) จำลอง Worker (ใน deploy/cloudflare) — ครั้งแรกคัดลอก .dev.vars.example เป็น .dev.vars
npm run dev
```

เปิด http://localhost:8787 — หน้าเว็บมาจาก Workers assets, `/api` วิ่งผ่าน Worker → backend ใน Docker
(เหมือนของจริงทุกอย่าง ยกเว้น backend ไม่ได้อยู่ใน Cloudflare container)

## 4) Deploy

```powershell
npm run deploy
```

= build หน้าเว็บ production → build + push image backend → deploy Worker
ครั้งแรกรอ container พร้อมสักพัก (หลายนาที) — ระหว่างนั้นหน้าเว็บขึ้นแล้วแต่ `/api` อาจยัง error

ทดสอบที่ URL `https://kornpassorn-care.<บัญชี>.workers.dev` ก่อน

## 5) ย้ายโดเมนจาก Tunnel มาที่ Worker

1. Cloudflare Dashboard → **Zero Trust → Networks → Tunnels** → ลบ public hostname `www.kronpatsroncare.com` (และ `kronpatsroncare.com`) ที่ชี้ไปเครื่องนี้
2. **Workers & Pages → kornpassorn-care → Settings → Domains & Routes → Add → Custom domain** → `www.kronpatsroncare.com` (และ `kronpatsroncare.com`)

## หลังจากนี้

| งาน | ทำยังไง |
|---|---|
| อัปเดตโค้ด | task **🌐 Cloudflare: Deploy ขึ้นจริง** (หรือ `npm.cmd run deploy` ใน `deploy/cloudflare`) |
| โครงสร้าง DB เปลี่ยน (เพิ่มตาราง/คอลัมน์) | task **☁️ Supabase: อัปเดตโครงสร้าง (ปลอดภัย)** — ทำ**ก่อน** deploy โค้ดใหม่ |
| ดู log backend สดๆ | `npm.cmd run logs` |
| Backup | Supabase มี backup อัตโนมัติ + task **💾 DB: Backup Supabase** |

## ข้อควรรู้

- container **หลับ** หลังไม่มีคนใช้ 12 ชม. (`sleepAfter` ใน [src/index.ts](src/index.ts)) — คนแรกที่เข้ามาหลังจากนั้นรอ NestJS เปิดใหม่หลายวินาที
- รัน backend แค่ 1 instance (`max_instances: 1`) ขนาด **basic** (CPU 1/4 core, RAM 1 GB — `instance_type` ใน [wrangler.jsonc](wrangler.jsonc)) — พอสำหรับคลินิก
- ค่าใช้จ่าย: CPU คิดเฉพาะตอนใช้งาน แต่ RAM คิดตลอดเวลาที่ container เปิด — `basic` เปิดเกือบทั้งวันเพิ่มราว $5–7/เดือน (ประมาณ ดูยอดจริงที่ Billing)
  อยากประหยัด: `sleepAfter = '2h'` (หลับตอนกลางคืน) หรือกลับไปใช้ `lite`
- เช็กความเร็ว: `1..3 | % { curl.exe -s -o NUL -w "%{time_total} s`n" https://www.kronpatsroncare.com/api/auth/csrf-token }`
  ครั้งแรกช้าแต่ครั้งต่อไปเร็ว = ตื่นจากหลับ (cold start) · ช้าทุกครั้ง = เครื่องเล็กไป
- ห้ามใส่ `.env*` ใน image — `backend/.dockerignore` กันไว้แล้ว
