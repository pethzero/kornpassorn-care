# 🚀 Kornpassorn Care - VS Code Tasks Guide

## 📋 Available Tasks

### 🎯 **Quick Start**
- `⚡ Quick Start Dev` - เริ่มทั้งระบบในโหมด Development
- `⚡ Quick Start Prod` - เริ่มทั้งระบบในโหมด Production

### 🔧 **NestJS Backend**
- `🚀 NestJS Dev` - รัน Backend ในโหมด Development (hot reload)
- `🏭 NestJS Prod` - รัน Backend ในโหมด Production
- `🔧 NestJS Build` - Build Backend project
- `🧪 NestJS Test` - รันเทส Backend
- `🔍 NestJS Lint` - ตรวจสอบโค้ด Backend
- `📦 NestJS Install` - ติดตั้ง dependencies ของ Backend

### 🅰️ **Angular Frontend**
- `🅰️ Angular Dev` - รัน Frontend ในโหมด Development
- `🏭 Angular Prod` - รัน Frontend ในโหมด Production
- `🔧 Angular Build` - Build Frontend project (development)
- `🏭 Angular Build Prod` - Build Frontend project (production)
- `🧪 Angular Test` - รันเทส Frontend
- `📦 Angular Install` - ติดตั้ง dependencies ของ Frontend

### 🚀 **Full Stack**
- `🚀 เริ่ม Full Stack Dev` - รันทั้ง Backend และ Frontend ในโหมด Development
- `🏭 เริ่ม Full Stack Prod` - รันทั้ง Backend และ Frontend ในโหมด Production
- `📦 Install All Dependencies` - ติดตั้ง dependencies ทั้งหมด
- `🔧 Build All` - Build ทั้ง Backend และ Frontend (development)
- `🏭 Build All Prod` - Build ทั้ง Backend และ Frontend (production)

### 🗃️ **Database**
- `🗃️ Start PostgreSQL` - เริ่ม PostgreSQL ใน Docker
- `🛑 Stop PostgreSQL` - หยุด PostgreSQL
- `🔍 Check PostgreSQL Status` - ตรวจสอบสถานะ PostgreSQL
- `🔗 Connect to PostgreSQL` - เชื่อมต่อกับ PostgreSQL

## 🎯 **How to Run**

### 1. **Development Mode (แนะนำสำหรับการพัฒนา)**
```
Ctrl+Shift+P → Tasks: Run Task → ⚡ Quick Start Dev
```
หรือ
```
Ctrl+Shift+P → Tasks: Run Task → 🚀 เริ่ม Full Stack Dev
```

### 2. **Production Mode**
```
Ctrl+Shift+P → Tasks: Run Task → ⚡ Quick Start Prod
```

### 3. **รันแยกส่วน**
- **Backend อย่างเดียว:** `🚀 NestJS Dev` หรือ `🏭 NestJS Prod`
- **Frontend อย่างเดียว:** `🅰️ Angular Dev` หรือ `🏭 Angular Prod`

## 🔧 **Environment Configuration**

### **Development (.env.dev)**
- Database: `postgres` (ใช้ database เริ่มต้นของ PostgreSQL)
- Port: 3000 (Backend), 4200 (Frontend)
- NODE_ENV: `dev`

### **Production (.env.production)**
- Database: `kornpassorn_db_prod`
- Port: 3000 (Backend), 5050 (Frontend)
- NODE_ENV: `production`

## 🐛 **Debugging**

### **Debug Configurations Available:**
- `🅰️ Debug Angular Dev` - Debug Angular ในโหมด Development
- `🅰️ Debug Angular Prod` - Debug Angular ในโหมด Production
- `🚀 Debug NestJS Dev` - Debug NestJS ในโหมด Development
- `🏭 Debug NestJS Prod` - Debug NestJS ในโหมด Production
- `🚀 Debug Full Stack Dev` - Debug ทั้งระบบในโหมด Development
- `🏭 Debug Full Stack Prod` - Debug ทั้งระบบในโหมด Production

### **การใช้งาน:**
1. กด `F5` หรือไปที่ **Run and Debug** panel
2. เลือก configuration ที่ต้องการ
3. กด Start Debugging

## 📁 **URLs**

### **Development:**
- Frontend: http://localhost:4200
- Backend: http://localhost:3000
- Database: localhost:5432

### **Production:**
- Frontend: http://localhost:5050
- Backend: http://localhost:3000
- Database: localhost:5432

## ⚡ **Tips**

1. **เริ่มต้นครั้งแรก:** รัน `📦 Install All Dependencies` ก่อน
2. **Development:** ใช้ `⚡ Quick Start Dev` เพื่อเริ่มทำงาน
3. **Database:** ตรวจสอบให้แน่ใจว่า Docker กำลังทำงาน ก่อนรัน database tasks
4. **Hot Reload:** ในโหมด Development จะมี hot reload ทั้ง Backend และ Frontend
5. **Production Build:** ในโหมด Production จะใช้ optimized build

## 🚨 **Troubleshooting**

### **Database Connection Error:**
1. ตรวจสอบว่า Docker กำลังทำงาน
2. รัน `🗃️ Start PostgreSQL` ก่อน
3. รัน `🔍 Check PostgreSQL Status` เพื่อตรวจสอบสถานะ

### **Port Already in Use:**
1. ปิด process ที่ใช้ port ดังกล่าว
2. เปลี่ยน port ในไฟล์ environment

### **Dependencies Error:**
1. รัน `📦 Install All Dependencies`
2. ลบ `node_modules` และรันใหม่
