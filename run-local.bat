@echo off
title Overseas Portal Local Environment Server Start
echo ==============================================
echo Starting Backend and Frontend Servers Local...
echo ==============================================

echo [1/2] Starting Spring Boot Backend...
start "Backend Server" cmd /k "cd /d %~dp0backend && call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local"

echo [2/2] Starting React Frontend...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo All servers have been launched in separate windows!
echo - Frontend: http://localhost:3000/OverseasPortal/
echo - Backend:  http://localhost:3001
echo.
echo Close this window or press any key to exit this launcher script.
pause
