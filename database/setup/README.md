# ติดตั้งฐานข้อมูล Kornpassorn Care

ชุดไฟล์ SQL สำหรับสร้างฐานข้อมูลของระบบบนเครื่องหรือเซิร์ฟเวอร์อื่น พร้อมผู้ใช้ตั้งต้นและข้อมูลตัวอย่าง
ใช้ได้กับ PostgreSQL 12 ขึ้นไป

| ไฟล์ | ข้างในมี | ใช้เมื่อ |
|---|---|---|
| `01_schema.sql` | โครงสร้างตารางทั้งหมด | ทุกครั้ง |
| `02_base_data.sql` | ผู้ใช้ตั้งต้น 2 บัญชี + เวลาทำการ | ทุกครั้ง |
| `03_demo_data.sql` | ข้อมูลตัวอย่าง: สินค้า 5 รายการ, คนไข้ตัวอย่าง 2 คน, นัดหมาย 5 รายการ, เอกสาร 8 ใบ, บัญชีการเงิน | เครื่องทดลอง / สาธิต (ไม่ต้องใช้กับเครื่องใช้งานจริง) |
| `kornpassorn_setup_all.sql` | 01 + 02 + 03 รวมไฟล์เดียว | ติดตั้งเครื่องทดลองแบบครบในคำสั่งเดียว |

## ผู้ใช้ตั้งต้น

| ชื่อผู้ใช้ | รหัสผ่าน | สิทธิ์ |
|---|---|---|
| `admin` | `admin1234` | admin |
| `user` | `123456` | user |

> ⚠️ รหัสผ่านนี้อยู่ในไฟล์ที่แชร์ได้ — **เปลี่ยนทันที** หลังติดตั้งบนเครื่องที่คนอื่นเข้าถึงได้

## วิธีติดตั้ง

### แบบที่ 1: psql (มากับ PostgreSQL)

```bash
# 1) สร้างฐานข้อมูลว่าง
createdb -U postgres kornpassorn_db_dev

# 2a) เครื่องทดลอง — ครบทั้งหมดในไฟล์เดียว
psql -U postgres -d kornpassorn_db_dev -f kornpassorn_setup_all.sql

# 2b) เครื่องใช้งานจริง — ไม่เอาข้อมูลตัวอย่าง
psql -U postgres -d kornpassorn_db -f 01_schema.sql
psql -U postgres -d kornpassorn_db -f 02_base_data.sql
```

### แบบที่ 2: pgAdmin

1. คลิกขวาที่ **Databases → Create → Database…** ตั้งชื่อ เช่น `kornpassorn_db_dev`
2. คลิกขวาที่ฐานข้อมูลใหม่ → **Query Tool**
3. เปิดไฟล์ (ไอคอนโฟลเดอร์) → เลือก `kornpassorn_setup_all.sql` → กด ▶ Execute

### แบบที่ 3: ผ่านโปรเจกต์ (ไม่ต้องมี psql)

```bash
cd backend
node scripts/run-sql.js ../database/setup/kornpassorn_setup_all.sql
```

ฐานข้อมูลที่ใช้ตามไฟล์ `backend/.env.dev` (`DB_NAME`) — สคริปต์นี้ปฏิเสธการรันกับฐานข้อมูล production

## หลังติดตั้ง

ตั้งค่าใน `backend/.env.dev` หรือ `backend/.env.production` ให้ชี้ฐานข้อมูลที่สร้าง:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=<รหัสผ่าน postgres>
DB_NAME=kornpassorn_db_dev
```

## สร้างไฟล์ชุดนี้ใหม่

เมื่อแก้โครงสร้างตาราง (entity) หรืออยากให้วันที่ในข้อมูลตัวอย่างเป็นปัจจุบัน:

```bash
cd backend
npm run db:build-setup
```

สคริปต์ทำงานบนฐานข้อมูลชั่วคราว (`kornpassorn_setup_tmp`) แล้วลบทิ้ง ไม่แตะฐานข้อมูล DEV/PRD
