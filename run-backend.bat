@echo off
title Overseas Portal Backend (Spring Boot)
echo [안내] Overseas Portal 백엔드 서버를 local 프로필로 구동합니다...
echo URL: http://localhost:3001
echo.
cd /d %~dp0backend
call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
pause
