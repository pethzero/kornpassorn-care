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

1. สร้าง project ใหม่ (region Singapore) แล้วจด connection string — host, user, password, database
2. dump ข้อมูล PRD จากเครื่องนี้ (`--no-owner` กัน error เรื่องสิทธิ์ของ user `postgres` ที่บนคลาวด์ไม่มี
   และไม่เอาตาราง lottery ของโปรเจกต์อื่นไปด้วย):

   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d kornpassorn_db `
     --no-owner --no-privileges --exclude-table=lottery_draw --exclude-table=lottery_draw_history `
     -f kornpassorn_db-to-cloud.sql
   ```

3. นำเข้าฐานข้อมูลบนคลาวด์ (ใช้ connection string ที่ได้จากข้อ 1):

   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" -f kornpassorn_db-to-cloud.sql
   ```

4. ลบไฟล์ `kornpassorn_db-to-cloud.sql` ทิ้งหลังนำเข้าเสร็จ (มีข้อมูลคนไข้)

## 2) ติดตั้งและ login

```powershell
cd deploy/cloudflare
npm install
npx wrangler login
```

## 3) ใส่ความลับ (ทำครั้งเดียว — ค่าเก็บที่ Cloudflare ไม่อยู่ในโค้ด)

ใช้ค่าเดียวกับ `backend/.env.production` สำหรับ JWT/CSRF (ไม่งั้นทุกคนต้อง login ใหม่ และ API client token เดิมใช้ไม่ได้)
ส่วน DB_* ใช้ของฐานข้อมูลบนคลาวด์:

```powershell
npx wrangler secret put DB_HOST
npx wrangler secret put DB_USER
npx wrangler secret put DB_PASS
npx wrangler secret put DB_NAME
npx wrangler secret put JWT_SECRET
npx wrangler secret put CSRF_SECRET
```

ค่าอื่นที่ไม่ใช่ความลับอยู่ใน `vars` ของ [wrangler.jsonc](wrangler.jsonc) แล้ว (`DB_SSL=true`, `DB_SYNC=false` ฯลฯ)

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
| อัปเดตโค้ด | `npm run deploy` (ใน `deploy/cloudflare`) |
| โครงสร้าง DB เปลี่ยน (เพิ่มตาราง/คอลัมน์) | รัน `npm run db:prod:sync` ใน `backend` โดยชี้ `.env.production` ไปที่ DB บนคลาวด์ชั่วคราว (`DB_SSL=true`) — หรือทำ `.env.cloud` แยก |
| ดู log backend สดๆ | `npm run logs` |
| Backup | Neon/Supabase มี backup อัตโนมัติ + ดึงสำรองเองด้วย `pg_dump` ได้ |

## ข้อควรรู้

- container **หลับ** หลังไม่มีคนใช้ 30 นาที (`sleepAfter` ใน [src/index.ts](src/index.ts)) — คนแรกที่เข้ามาหลังจากนั้นรอไม่กี่วินาที
- รัน backend แค่ 1 instance (`max_instances: 1`) — พอสำหรับคลินิก
- ห้ามใส่ `.env*` ใน image — `backend/.dockerignore` กันไว้แล้ว
