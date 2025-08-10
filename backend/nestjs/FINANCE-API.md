# 💰 Finance Records API Documentation

## 📋 **Overview**
API สำหรับจัดการรายการรายรับรายจ่าย (Finance Records) ใน NestJS

## 🔗 **Base URL**
```
http://localhost:3000/api/finance
```

## 📊 **Endpoints**

### **1. สร้างรายการการเงินใหม่**
```http
POST /api/finance
```

**Request Body:**
```json
{
  "item_name": "เงินเดือนเดือนสิงหาคม",
  "category": "income",
  "amount": 45000.00,
  "record_date": "2025-08-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "สร้างรายการการเงินเรียบร้อยแล้ว",
  "data": {
    "id": 1,
    "item_name": "เงินเดือนเดือนสิงหาคม",
    "category": "income",
    "amount": "45000.00",
    "record_date": "2025-08-01",
    "created_at": "2025-08-10T10:30:00.000Z"
  }
}
```

### **2. ดึงข้อมูลทั้งหมด (พร้อม Pagination และ Filter)**
```http
GET /api/finance?page=1&limit=10&category=income&search=เงินเดือน
```

**Query Parameters:**
- `page` (optional): หน้าที่ต้องการ (default: 1)
- `limit` (optional): จำนวนรายการต่อหน้า (default: 10)
- `category` (optional): ประเภท `income` หรือ `expense`
- `search` (optional): ค้นหาในชื่อรายการ
- `start_date` (optional): วันที่เริ่มต้น (YYYY-MM-DD)
- `end_date` (optional): วันที่สิ้นสุด (YYYY-MM-DD)
- `sort_by` (optional): เรียงตาม (default: created_at)
- `sort_order` (optional): ASC หรือ DESC (default: DESC)

**Response:**
```json
{
  "success": true,
  "message": "ดึงข้อมูลรายการการเงินเรียบร้อยแล้ว",
  "data": [
    {
      "id": 1,
      "item_name": "เงินเดือนเดือนสิงหาคม",
      "category": "income",
      "amount": "45000.00",
      "record_date": "2025-08-01",
      "created_at": "2025-08-10T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  }
}
```

### **3. ดึงข้อมูลตาม ID**
```http
GET /api/finance/1
```

**Response:**
```json
{
  "success": true,
  "message": "ดึงข้อมูลรายการการเงินเรียบร้อยแล้ว",
  "data": {
    "id": 1,
    "item_name": "เงินเดือนเดือนสิงหาคม",
    "category": "income",
    "amount": "45000.00",
    "record_date": "2025-08-01",
    "created_at": "2025-08-10T10:30:00.000Z"
  }
}
```

### **4. อัปเดตข้อมูล**
```http
PATCH /api/finance/1
```

**Request Body:**
```json
{
  "item_name": "เงินเดือนเดือนสิงหาคม (แก้ไข)",
  "amount": 50000.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "อัปเดตรายการการเงินเรียบร้อยแล้ว",
  "data": {
    "id": 1,
    "item_name": "เงินเดือนเดือนสิงหาคม (แก้ไข)",
    "category": "income",
    "amount": "50000.00",
    "record_date": "2025-08-01",
    "created_at": "2025-08-10T10:30:00.000Z"
  }
}
```

### **5. ลบข้อมูล**
```http
DELETE /api/finance/1
```

**Response:**
```json
{
  "success": true,
  "message": "ลบรายการการเงิน ID: 1 เรียบร้อยแล้ว"
}
```

### **6. สรุปยอดรายได้/รายจ่าย**
```http
GET /api/finance/summary?start_date=2025-08-01&end_date=2025-08-31
```

**Response:**
```json
{
  "success": true,
  "message": "ดึงข้อมูลสรุปการเงินเรียบร้อยแล้ว",
  "data": {
    "income": {
      "count": 5,
      "total": 54300.00,
      "average": 10860.00
    },
    "expense": {
      "count": 8,
      "total": 36950.00,
      "average": 4618.75
    },
    "net_income": 17350.00,
    "date_range": {
      "start_date": "2025-08-01",
      "end_date": "2025-08-31"
    }
  }
}
```

### **7. รายงานรายวัน**
```http
GET /api/finance/reports/daily?start_date=2025-08-01&end_date=2025-08-07
```

**Response:**
```json
{
  "success": true,
  "message": "ดึงข้อมูลรายงานรายวันเรียบร้อยแล้ว",
  "data": [
    {
      "date": "2025-08-07",
      "income": { "count": 1, "total": 2000.00 },
      "expense": { "count": 2, "total": 1650.00 },
      "net": 350.00
    },
    {
      "date": "2025-08-06",
      "income": { "count": 0, "total": 0 },
      "expense": { "count": 1, "total": 2800.00 },
      "net": -2800.00
    }
  ]
}
```

## 🔧 **Validation Rules**

### **CreateFinanceRecordDto:**
- `item_name`: string, required, max 255 characters
- `category`: enum ['income', 'expense'], required
- `amount`: number, positive, max 2 decimal places
- `record_date`: date string (YYYY-MM-DD), required

### **UpdateFinanceRecordDto:**
- ทุกฟิลด์เป็น optional (partial update)

### **QueryFinanceRecordDto:**
- `category`: enum ['income', 'expense'], optional
- `start_date`: date string, optional
- `end_date`: date string, optional
- `page`: number ≥ 1, optional (default: 1)
- `limit`: number ≥ 1, optional (default: 10)
- `search`: string, optional
- `sort_by`: enum ['id', 'item_name', 'amount', 'record_date', 'created_at'], optional
- `sort_order`: enum ['ASC', 'DESC'], optional

## 🚨 **Error Responses**

### **400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### **404 Not Found**
```json
{
  "statusCode": 404,
  "message": "ไม่พบรายการการเงิน ID: 1",
  "error": "Not Found"
}
```

## 💡 **Usage Examples**

### **ทดสอบด้วย cURL:**

**สร้างรายการใหม่:**
```bash
curl -X POST http://localhost:3000/api/finance \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "ค่าตรวจรักษา",
    "category": "income", 
    "amount": 1500.00,
    "record_date": "2025-08-10"
  }'
```

**ดึงข้อมูลทั้งหมด:**
```bash
curl "http://localhost:3000/api/finance?page=1&limit=5&category=income"
```

**ดูสรุปการเงิน:**
```bash
curl "http://localhost:3000/api/finance/summary?start_date=2025-08-01&end_date=2025-08-31"
```

## 🎯 **Features**
- ✅ CRUD Operations (Create, Read, Update, Delete)
- ✅ Pagination และ Filtering
- ✅ Search ในชื่อรายการ
- ✅ Date range filtering  
- ✅ Sorting ตามฟิลด์ต่างๆ
- ✅ สรุปยอดรายได้/รายจ่าย
- ✅ รายงานรายวัน
- ✅ Input validation
- ✅ Error handling
- ✅ TypeScript support
