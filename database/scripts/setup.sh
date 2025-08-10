#!/bin/bash
# =======================================
# Setup Database Script
# สคริปต์สำหรับสร้างฐานข้อมูลใหม่
# =======================================

set -e

# ตัวแปรการตั้งค่า
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-kornpassorn_db}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-123456}

echo "🚀 กำลังติดตั้งฐานข้อมูล Kornpassorn Care..."

# ตรวจสอบการเชื่อมต่อ PostgreSQL
echo "📡 ตรวจสอบการเชื่อมต่อ PostgreSQL..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT version();" || {
    echo "❌ ไม่สามารถเชื่อมต่อ PostgreSQL ได้"
    exit 1
}

# สร้างฐานข้อมูล
echo "🗃️ สร้างฐานข้อมูล..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -f setup.sql

echo "📋 สร้าง Schema..."
# สร้าง schemas ตามลำดับ
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schemas/01_auth_schema.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schemas/02_medical_schema.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schemas/03_financial_schema.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schemas/04_audit_schema.sql

echo "🌱 เพิ่มข้อมูลเริ่มต้น..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f seeds/initial_data.sql

echo "✅ ติดตั้งฐานข้อมูลเสร็จสิ้น!"
echo "🔑 ข้อมูลการเข้าใช้งาน:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo "   - Database: $DB_NAME"
echo "   - Host: $DB_HOST:$DB_PORT"
