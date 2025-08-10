# 🔐 Token Authentication Guide

## 📋 **วิธีการใช้งาน Token Authentication**

### **1. ขั้นตอนการทำงาน**
```
Step 1: Login เพื่อรับ Token
Step 2: เก็บ Token ไว้ (localStorage/sessionStorage)  
Step 3: ส่ง Token ใน Header เมื่อเรียก API
Step 4: Server ตรวจสอบ Token และอนุญาตให้เข้าถึงข้อมูล
```

---

## 🚀 **การใช้งานจริง**

### **Step 1: Login เพื่อรับ Token**

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

### **Step 2: ใช้ Token เรียก API**

**🔓 API ที่ไม่ต้องใช้ Token:**
```bash
curl http://localhost:3000/api/protected/public
```

**🔐 API ที่ต้องใช้ Token:**
```bash
curl -X GET http://localhost:3000/api/protected/user-info \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**🔐 เรียก API ราคา:**
```bash
curl -X GET http://localhost:3000/api/protected/prices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**🔐 เรียก Finance API:**
```bash
curl -X GET http://localhost:3000/api/finance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 💻 **ตัวอย่างการใช้งานใน JavaScript**

### **1. Login และเก็บ Token**
```javascript
// Login Function
async function login(username, password) {
  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    
    if (data.access_token) {
      // เก็บ token ใน localStorage
      localStorage.setItem('authToken', data.access_token);
      console.log('Login สำเร็จ!');
      return data.access_token;
    } else {
      console.error('Login ล้มเหลว');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// ใช้งาน
login('admin', 'admin123').then(token => {
  if (token) {
    console.log('Token:', token);
  }
});
```

### **2. สร้าง Function สำหรับเรียก API ด้วย Token**
```javascript
// Generic API Call Function
async function apiCall(url, method = 'GET', data = null) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('ไม่พบ Token กรุณา Login ก่อน');
    return null;
  }

  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (response.ok) {
      return result;
    } else {
      console.error('API Error:', result);
      
      // ถ้า Token หมดอายุ
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        alert('Token หมดอายุ กรุณา Login ใหม่');
      }
      return null;
    }
  } catch (error) {
    console.error('Network Error:', error);
    return null;
  }
}
```

### **3. ตัวอย่างการเรียก API ต่างๆ**
```javascript
// ดึงข้อมูลผู้ใช้
async function getUserInfo() {
  const result = await apiCall('http://localhost:3000/api/protected/user-info');
  if (result) {
    console.log('ข้อมูลผู้ใช้:', result.data);
  }
}

// ดึงราคาบริการ
async function getPrices() {
  const result = await apiCall('http://localhost:3000/api/protected/prices');
  if (result) {
    console.log('รายการราคา:', result.data.prices);
    return result.data.prices;
  }
}

// ดึงข้อมูลการเงิน
async function getFinanceRecords() {
  const result = await apiCall('http://localhost:3000/api/finance');
  if (result) {
    console.log('รายการการเงิน:', result.data);
    return result.data;
  }
}

// สร้างรายการการเงินใหม่
async function createFinanceRecord(recordData) {
  const result = await apiCall('http://localhost:3000/api/finance', 'POST', recordData);
  if (result) {
    console.log('สร้างรายการสำเร็จ:', result.data);
    return result.data;
  }
}

// ใช้งาน
getUserInfo();
getPrices();
getFinanceRecords();

// สร้างรายการใหม่
createFinanceRecord({
  item_name: 'ค่าตรวจรักษา',
  category: 'income',
  amount: 1500,
  record_date: '2025-08-10'
});
```

---

## 🎯 **ตัวอย่างการใช้งานใน Frontend (React/Angular)**

### **React Example:**
```javascript
// AuthContext.js
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (data.access_token) {
        setToken(data.access_token);
        localStorage.setItem('authToken', data.access_token);
        
        // ดึงข้อมูลผู้ใช้
        const userInfo = await apiCall('/api/protected/user-info');
        setUser(userInfo.data.user);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const apiCall = async (url, method = 'GET', data = null) => {
    if (!token) throw new Error('No token available');

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`http://localhost:3000${url}`, options);
    
    if (response.status === 401) {
      logout();
      throw new Error('Token expired');
    }

    return response.json();
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, apiCall }}>
      {children}
    </AuthContext.Provider>
  );
};

// ใช้งานใน Component
function PricesComponent() {
  const { apiCall } = useAuth();
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    apiCall('/api/protected/prices')
      .then(result => setPrices(result.data.prices))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      <h2>รายการราคา</h2>
      {prices.map(price => (
        <div key={price.service}>
          {price.service}: {price.price} {price.currency}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔒 **Security Best Practices**

### **1. เก็บ Token อย่างปลอดภัย:**
```javascript
// ✅ ดี - ใช้ httpOnly cookies (ถ้าเป็น same domain)
// Server จะ set cookie อัตโนมัติ

// ✅ ยอมรับได้ - localStorage (สำหรับ SPA)
localStorage.setItem('authToken', token);

// ❌ หลีกเลี่ยง - sessionStorage (ถ้าต้องการ persistent login)
// ❌ หลีกเลี่ยง - global variables
```

### **2. Handle Token Expiration:**
```javascript
async function apiCallWithRefresh(url, method = 'GET', data = null) {
  try {
    return await apiCall(url, method, data);
  } catch (error) {
    if (error.message === 'Token expired') {
      // Redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
}
```

### **3. Logout ที่ปลอดภัย:**
```javascript
async function secureLogout() {
  try {
    // เรียก logout API เพื่อ revoke token
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
  } catch (error) {
    console.error('Logout API failed:', error);
  } finally {
    // ลบ token ไม่ว่าจะสำเร็จหรือไม่
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}
```

---

## 🧪 **การทดสอบ**

### **ทดสอบใน Browser Console:**
```javascript
// 1. Login
fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('token', data.access_token);
  console.log('Token:', data.access_token);
});

// 2. Test API
fetch('http://localhost:3000/api/protected/prices', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(res => res.json())
.then(data => console.log('Prices:', data));
```

นี่คือวิธีการทำ Token Authentication แบบสมบูรณ์! 🎉
