# ย้ายฐานข้อมูลจากเครื่องเราขึ้น Supabase

```
เครื่องเรา (PostgreSQL)                         Supabase (PostgreSQL บนคลาวด์)
kornpassorn_db (PRD)  ──── db:cloud:push ────▶  postgres  (schema public)
                          ① สร้างตารางตามโค้ด
                          ② ใส่ข้อมูล (transaction เดียว)
                          ③ เทียบจำนวนแถวทุกตาราง
```

ทุกอย่างกดได้จากเมนู **Ctrl+Shift+P → Tasks: Run Task** (หมวด ☁️ Supabase) ไม่ต้องพิมพ์คำสั่งเอง

> **ความปลอดภัย** — รหัสผ่านฐานข้อมูลอยู่ใน `backend/.env.supabase` ที่เดียว (ไฟล์นี้ไม่ขึ้น git)
> ห้ามวาง connection string ที่มีรหัสผ่านในแชท/อีเมล/โค้ด — ถ้าเผลอ ให้ Reset password ใน Supabase ทันที

---

## ครั้งแรก (ทำครั้งเดียว)

### 1. สร้าง project บน Supabase

1. เข้า [supabase.com](https://supabase.com) → **New project**
2. **Region: Southeast Asia (Singapore)** — ใกล้ไทยที่สุด (เปลี่ยนทีหลังไม่ได้)
3. ตั้ง **Database password** → จดไว้ในที่ปลอดภัย (password manager)

### 2. ดูค่าการเชื่อมต่อ

กดปุ่ม **Connect** (ด้านบนของหน้า project) → เลือก **Session pooler** จะได้ connection string แบบนี้:

```
postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
             └──── USER ────────┘ └─ รหัสผ่าน ─┘ └──────────────── HOST ─────────────────┘ └PORT┘ └DB─┘
```

ใช้ **Session pooler** (พอร์ต 5432) — ไม่ใช่ Transaction pooler (6543) และไม่ใช่ Direct connection (เครื่องที่ไม่มี IPv6 ต่อไม่ได้)

### 3. ใบรับรอง SSL

Supabase ใช้ CA ของตัวเอง — ไฟล์อยู่ใน repo แล้วที่ `backend/certs/supabase-ca.crt` (ใบรับรองสาธารณะ ไม่ใช่ความลับ ใช้ได้ทุก project)
ถ้าไม่มี: **Project Settings → Database → SSL Configuration → Download certificate** แล้วบันทึกเป็นชื่อนี้

### 4. สร้างไฟล์ `backend/.env.supabase`

คัดลอกด้านล่างไปสร้างไฟล์ใหม่ แล้วแก้ 3 บรรทัดที่มี `←` ตามค่าจากข้อ 2:

```ini
# ฐานข้อมูลบน Supabase — ไฟล์นี้ไม่ขึ้น git (.env.*)
DB_TYPE=postgres
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com   ← HOST
DB_PORT=5432
DB_USER=postgres.abcdefghijk                       ← USER
DB_PASS=                                           ← รหัสผ่าน (ไม่ต้องมีเครื่องหมายคำพูด)
DB_NAME=postgres
DB_SSL=true
DB_SSL_CA=certs/supabase-ca.crt
DB_SYNC=false
DB_LOGGING=false
```

> ลบข้อความ `← ...` ออกด้วย — ในไฟล์จริงแต่ละบรรทัดมีแค่ `ชื่อ=ค่า`

### 5. ย้ายข้อมูล

**Tasks: Run Task → ☁️ Supabase: ย้ายข้อมูลจาก PRD ขึ้น (ครั้งแรก)**

หรือพิมพ์เอง: `cd backend` แล้ว `npm.cmd run db:cloud:push`

ผลที่ถูกต้อง:

```
① อัปเดตโครงสร้างตาราง
   พบการเปลี่ยนแปลง 63 คำสั่ง ... ✔ อัปเดตโครงสร้างเรียบร้อย
③ ดึงข้อมูลจาก kornpassorn_db
④ ส่งข้อมูลขึ้น Supabase
⑤ เทียบจำนวนแถว
   ✓ patients        3 → 3
   ✓ users           2 → 2
   ...
✔ ย้ายข้อมูลขึ้น Supabase เรียบร้อย (22 ตาราง)
```

### 6. ตรวจดู

Supabase → **Table Editor** → เห็นตาราง `users`, `patients`, `documents` ... พร้อมข้อมูล

---

## งานประจำหลังจากนี้

| เมื่อไหร่ | Task (☁️ / 💾) | คำสั่ง (ใน `backend`) |
|---|---|---|
| แก้ entity (เพิ่มตาราง/คอลัมน์) — ทำ**ก่อน** deploy | ☁️ Supabase: ตรวจโครงสร้าง → อัปเดตโครงสร้าง (ปลอดภัย) | `npm.cmd run db:cloud:check` → `db:cloud:sync` |
| โค้ดใหม่เลิกใช้คอลัมน์ — ทำ**หลัง** deploy เสร็จ | ☁️ Supabase: ลบคอลัมน์ที่เลิกใช้ (⚠ หลัง deploy) | `npm.cmd run db:cloud:sync -- --allow-drop` |
| สำรองข้อมูลบนคลาวด์ | 💾 DB: Backup Supabase | `npm.cmd run db:backup:cloud` |
| อยากให้คลาวด์ = ข้อมูลในเครื่องอีกรอบ | ☁️ Supabase: เขียนทับด้วยข้อมูล PRD (⚠) | `npm.cmd run db:cloud:push -- --replace` |
| ใช้ DB DEV เป็นต้นทางแทน PRD | — | `npm.cmd run db:cloud:push -- --from-dev` |

**⚠ เขียนทับ (`--replace`)** = ข้อมูลที่เกิดบนคลาวด์หลังย้าย (คนไข้ใหม่ เอกสาร login) **หายหมด** แทนด้วยของในเครื่อง
สคริปต์ backup ของบนคลาวด์ไว้ให้ก่อนที่ `database/backup/supabase-before-replace-<เวลา>.sql` และทำในจังหวะเดียว (พังกลางทาง = ไม่มีอะไรเปลี่ยน)
เมื่อเปิดใช้งานจริงบนคลาวด์แล้ว **ห้ามใช้** — ข้อมูลจริงอยู่บนคลาวด์แล้ว

ไฟล์ backup ทั้งหมดอยู่ใน `database/backup/` (ไม่ขึ้น git) — กู้คืนด้วย `psql` ลงฐานข้อมูลที่มีตารางแล้ว

## จำลองเว็บในเครื่องโดยใช้ฐานข้อมูล Supabase

เปิด Docker Desktop ก่อน แล้ว **Tasks: Run Task**:

1. **🌐 Cloudflare: Build หน้าเว็บ** และ **🌐 Cloudflare: Build backend image** (ครั้งแรก / หลังแก้โค้ด)
2. **🌐 Cloudflare จำลอง: เริ่มทั้งหมด** → เปิด http://127.0.0.1:8787

login ด้วย user/รหัสของ PRD (ย้ายขึ้นไปพร้อมข้อมูล) — รายละเอียด deploy จริงดู [deploy/cloudflare/README.md](../deploy/cloudflare/README.md)

---

## แก้ปัญหา

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `npm.ps1 cannot be loaded ... not digitally signed` | PowerShell บล็อกสคริปต์ → พิมพ์ `npm.cmd` แทน `npm` (Task ในเมนูไม่โดน) |
| `password authentication failed` | `DB_PASS` / `DB_USER` ใน `.env.supabase` ไม่ตรง — USER ต้องเป็น `postgres.<project-ref>` ไม่ใช่ `postgres` เฉยๆ |
| `self-signed certificate in certificate chain` | ไม่มีไฟล์ใบรับรอง หรือ `DB_SSL_CA` ชี้ผิด → ดูข้อ 3 |
| `ยังไม่ได้ใส่ DB_PASS` | ใส่รหัสใน `backend/.env.supabase` แล้วบันทึก (Ctrl+S) |
| `Supabase มีข้อมูลอยู่แล้ว` | ย้ายไปแล้ว ไม่ต้องทำซ้ำ — ถ้าตั้งใจทับจริงใช้ task เขียนทับ (อ่านคำเตือนด้านบนก่อน) |
| `getaddrinfo ENOTFOUND` / ต่อไม่ได้เลย | HOST พิมพ์ผิด หรือ project ถูก **pause** (แพ็กเกจฟรีหยุดเองเมื่อไม่มีคนใช้ ~1 สัปดาห์) → กด Restore ในหน้า project |
| ทำมือแล้วเจอ `invalid command \N` | ใช้ `pg_dump --data-only` ใส่ลงฐานข้อมูลที่ยังไม่มีตาราง → ใช้ `db:cloud:push` แทน (สร้างตารางให้ก่อน) |
| ทำมือด้วย dump ทั้งก้อนแล้ว users สร้างไม่ได้ | dump เขียน `public.uuid_generate_v4()` แต่บน Supabase อยู่ schema `extensions` → ใช้ `db:cloud:push` แทน |

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `backend/.env.supabase` | ค่าเชื่อมต่อ Supabase (มีรหัสผ่าน — ไม่ขึ้น git) |
| `backend/certs/supabase-ca.crt` | ใบรับรอง CA ของ Supabase |
| `backend/scripts/cloud-db-push.js` | ย้ายข้อมูล (`db:cloud:push`) |
| `backend/scripts/prod-db-sync.ts` | สร้าง/อัปเดตโครงสร้างตาราง (`db:cloud:check` / `db:cloud:sync`) |
| `backend/scripts/db-backup.js` | backup (`db:backup:cloud`) |
