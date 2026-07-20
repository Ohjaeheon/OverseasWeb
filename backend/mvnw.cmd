@echo off
if defined JAVA_HOME goto CHECK_MAVEN

if exist "C:\Program Files\Java\jdk-21\bin\java.exe" set "JAVA_HOME=C:\Program Files\Java\jdk-21"
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot\bin\java.exe" set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
if exist "%USERPROFILE%\.jdks\corretto-17.0.12\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\corretto-17.0.12"
if exist "%USERPROFILE%\.jdks\corretto-21.0.6\bin\java.exe" set "JAVA_HOME=%USERPROFILE%\.jdks\corretto-21.0.6"

:CHECK_MAVEN
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

set "MAVEN_CMD=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6\apache-maven-3.9.6\bin\mvn.cmd"

if exist "%MAVEN_CMD%" goto RUN_MAVEN_CMD

mvn.cmd %*
goto END

:RUN_MAVEN_CMD
call "%MAVEN_CMD%" %*

:END
