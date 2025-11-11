@echo off
setlocal

:: ================================
:: ⚙️ CONFIG
:: ================================
set PROJECT_PATH=D:\PROJECT\kornpassorn-care\webui\my-react
set SRC_PATH=%PROJECT_PATH%\src

echo ===========================================
echo 🚀 Creating React Project Structure
echo Location: %PROJECT_PATH%
echo ===========================================

:: ตรวจสอบว่าโฟลเดอร์หลักมีหรือยัง
if not exist "%PROJECT_PATH%" (
    echo ❌ Project folder not found!
    echo Creating: %PROJECT_PATH%
    mkdir "%PROJECT_PATH%"
)

:: ================================
:: สร้างโฟลเดอร์หลักของ src
:: ================================
mkdir "%SRC_PATH%"
mkdir "%SRC_PATH%\assets"
mkdir "%SRC_PATH%\components"
mkdir "%SRC_PATH%\pages"
mkdir "%SRC_PATH%\layouts"
mkdir "%SRC_PATH%\routes"
mkdir "%SRC_PATH%\services"
mkdir "%SRC_PATH%\contexts"
mkdir "%SRC_PATH%\hooks"
mkdir "%SRC_PATH%\store"
mkdir "%SRC_PATH%\utils"
mkdir "%SRC_PATH%\styles"

:: ================================
:: สร้างไฟล์พื้นฐาน
:: ================================
echo import React from "react";> "%SRC_PATH%\App.jsx"
echo export default function App() {return (<div>Hello React!</div>);}>> "%SRC_PATH%\App.jsx"

echo import React from "react";> "%SRC_PATH%\main.jsx"
echo import ReactDOM from "react-dom/client";>> "%SRC_PATH%\main.jsx"
echo import App from "./App";>> "%SRC_PATH%\main.jsx"
echo import "./styles/global.css";>> "%SRC_PATH%\main.jsx"
echo ReactDOM.createRoot(document.getElementById("root")).render(<App />);>> "%SRC_PATH%\main.jsx"

echo /* global styles */> "%SRC_PATH%\styles\global.css"
echo body {font-family: sans-serif;margin: 0;padding: 0;background: #f8f9fa;}>> "%SRC_PATH%\styles\global.css"

echo import axios from "axios";> "%SRC_PATH%\services\api.js"
echo const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api" });>> "%SRC_PATH%\services\api.js"
echo export default api;>> "%SRC_PATH%\services\api.js"

echo import { BrowserRouter, Routes, Route } from "react-router-dom";> "%SRC_PATH%\routes\AppRoutes.jsx"
echo import Home from "@/pages/Home";>> "%SRC_PATH%\routes\AppRoutes.jsx"
echo export default function AppRoutes() {return (<BrowserRouter><Routes><Route path="/" element={<Home />} /></Routes></BrowserRouter>);}>> "%SRC_PATH%\routes\AppRoutes.jsx"

echo export default function Home() {return (<h1>🏠 Home Page</h1>);} > "%SRC_PATH%\pages\Home.jsx"

echo VITE_API_URL=http://localhost:3000/api> "%PROJECT_PATH%\.env"

:: ================================
:: สร้าง public folder
:: ================================
mkdir "%PROJECT_PATH%\public"
echo ^<!DOCTYPE html^> > "%PROJECT_PATH%\public\index.html"
echo ^<html lang="en"^> >> "%PROJECT_PATH%\public\index.html"
echo ^<head^> >> "%PROJECT_PATH%\public\index.html"
echo     ^<meta charset="UTF-8" /^> >> "%PROJECT_PATH%\public\index.html"
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^> >> "%PROJECT_PATH%\public\index.html"
echo     ^<title^>React App^</title^> >> "%PROJECT_PATH%\public\index.html"
echo ^</head^> >> "%PROJECT_PATH%\public\index.html"
echo ^<body^> >> "%PROJECT_PATH%\public\index.html"
echo     ^<div id="root"^>^</div^> >> "%PROJECT_PATH%\public\index.html"
echo ^</body^> >> "%PROJECT_PATH%\public\index.html"
echo ^</html^> >> "%PROJECT_PATH%\public\index.html"

echo ✅ Done!
pause
