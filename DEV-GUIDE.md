# 🚀 Kornpassorn Care - Development Guide

## 📋 Quick Start Options

### 🔥 แนะนำสำหรับผู้เริ่มต้น
1. **🌟 สร้าง Next.js Project** - สร้างโปรเจกต์ Next.js ใหม่
2. **⚡ รัน Next.js** - รัน Next.js development server  
3. **🚀 เริ่ม Next.js + Backend** - รัน Backend + Next.js พร้อมกัน

### 🅰️ สำหรับผู้ที่ต้องการใช้ Angular
1. **🅰️ รัน Angular** - รัน Angular development server
2. **🚀 เริ่ม Angular + Backend** - รัน Backend + Angular พร้อมกัน

## 🎯 Tasks หลัก

### ⚡ Next.js Tasks
- **⚡ รัน Next.js** - Development server (http://localhost:3000)
- **🔧 Next.js Build** - Build for production
- **🚀 Next.js Start (Production)** - Run production build
- **🧪 Next.js Test** - Run tests
- **📦 Next.js Install** - Install dependencies
- **🔍 Next.js Lint** - Lint code

### 🅰️ Angular Tasks  
- **🅰️ รัน Angular** - Development server (http://localhost:4200)
- **🔧 Angular Build** - Build for production
- **🧪 Angular Test** - Run tests
- **📦 Angular Install** - Install dependencies

### 🗄️ Backend Tasks
- **🚀 Quick Start (SQLite)** - รัน Backend ด้วย SQLite (ไม่ต้องติดตั้ง PostgreSQL)
- **Backend: Start Development** - รัน NestJS backend
- **Backend: Build** - Build backend
- **Backend: Test** - Run backend tests

### 💾 Database Tasks
- **Database: Quick SQLite Setup** - ใช้ SQLite (แนะนำ)
- **Database: Start PostgreSQL (Docker)** - ใช้ PostgreSQL
- **Database: Run Setup Script** - รัน SQL script

## 🔧 วิธีใช้งาน

### 1. ใช้ VS Code Tasks (แนะนำ)
```
Ctrl+Shift+P → Tasks: Run Task → เลือก task ที่ต้องการ
```

### 2. ใช้ Shortcut
```
Ctrl+Shift+T → เข้าถึง Tasks โดยตรง
```

### 3. ใช้ Debug (F5)
```
F5 → เลือก Launch configuration
```

## 🌐 URLs
- **Next.js Frontend**: http://localhost:3000
- **Angular Frontend**: http://localhost:4200  
- **NestJS Backend**: http://localhost:3000/api
- **pgAdmin**: http://localhost:8080 (เมื่อใช้ Docker)

## 📦 การติดตั้ง

### สร้างโปรเจกต์ Next.js ใหม่:
รัน task: **🌟 สร้าง Next.js Project**

### ติดตั้ง Dependencies:
- **📦 Next.js Install** - สำหรับ Next.js
- **📦 Angular Install** - สำหรับ Angular  
- **Install Dependencies: Backend** - สำหรับ Backend

## 🎉 เริ่มต้นใช้งาน

### สำหรับ Next.js (แนะนำ):
1. รัน **🌟 สร้าง Next.js Project** (ครั้งแรกเท่านั้น)
2. รัน **🚀 เริ่ม Next.js + Backend**
3. เปิดเบราว์เซอร์ไป http://localhost:3000

### สำหรับ Angular:
1. รัน **🚀 เริ่ม Angular + Backend**  
2. เปิดเบราว์เซอร์ไป http://localhost:4200

## 💡 Tips
- ใช้ SQLite สำหรับ development (ไม่ต้องติดตั้ง PostgreSQL)
- ใช้ PostgreSQL สำหรับ production
- Tasks ถูกจัดกลุ่มตาม presentation group
- ทุก task มี problem matcher สำหรับ error detection
