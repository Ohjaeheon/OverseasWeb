@echo off
setlocal

if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Java\jdk-21" set "JAVA_HOME=C:\Program Files\Java\jdk-21"
    if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot" set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
    if exist "%USERPROFILE%\.jdks\corretto-17.0.12" set "JAVA_HOME=%USERPROFILE%\.jdks\corretto-17.0.12"
    if exist "%USERPROFILE%\.jdks\corretto-21.0.6" set "JAVA_HOME=%USERPROFILE%\.jdks\corretto-21.0.6"
)
if not "%JAVA_HOME%"=="" set "PATH=%JAVA_HOME%\bin;%PATH%"

call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local %*

endlocal
