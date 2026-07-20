@echo off
title Overseas Portal Frontend (React Vite)
echo [안내] Overseas Portal 프론트엔드 개발 서버를 구동합니다...
echo URL: http://localhost:3000/OverseasPortal/
echo.
cd /d %~dp0frontend
npm install && npm run dev
pause
