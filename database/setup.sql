-- =======================================
-- Kornpassorn Care Database Setup
-- ระบบจัดการคลินิก + รายรับรายจ่าย
-- =======================================

-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS kornpassorn_db;

-- เชื่อมต่อกับฐานข้อมูล
\c kornpassorn_db;

-- เปิดใช้ extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- กำหนด timezone
SET timezone = 'Asia/Bangkok';

-- สร้าง schemas
CREATE SCHEMA IF NOT EXISTS medical;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS audit;

-- กำหนด search path
SET search_path TO public, medical, financial, auth, audit;

COMMENT ON DATABASE kornpassorn_db IS 'ระบบจัดการคลินิกและการเงิน Kornpassorn Care';
