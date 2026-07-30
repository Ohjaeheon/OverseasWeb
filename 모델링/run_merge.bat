@echo off
echo ==================================================
echo      해외 주간예배출결 자동 취합 프로그램
echo ==================================================
echo.

REM 1. 파이썬 설치 여부 확인 및 자동 설치
where python >nul 2>&1
if %errorlevel% equ 0 goto has_python

REM 이미 설치되어 있으나 PATH만 안 걸려있는지 확인
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    set "PATH=%LocalAppData%\Programs\Python\Python313;%LocalAppData%\Programs\Python\Python313\Scripts;%PATH%"
    goto has_python
)
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set "PATH=%LocalAppData%\Programs\Python\Python312;%LocalAppData%\Programs\Python\Python312\Scripts;%PATH%"
    goto has_python
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set "PATH=%LocalAppData%\Programs\Python\Python311;%LocalAppData%\Programs\Python\Python311\Scripts;%PATH%"
    goto has_python
)

echo [정보] 시스템에 Python이 설치되어 있지 않습니다.
echo [진행] 인터넷에서 Python 3.12 설치 프로그램을 다운로드합니다...
curl -L -o "%temp%\python_installer.exe" https://www.python.org/ftp/python/3.12.3/python-3.12.3-amd64.exe
if %errorlevel% neq 0 (
    echo [오류] Python 다운로드에 실패했습니다. 인터넷 연결을 확인해 주세요.
    goto installer_fail
)

echo [진행] Python을 백그라운드에서 자동으로 설치 중입니다... (1~2분 정도 소요)
start /wait "" "%temp%\python_installer.exe" /quiet InstallAllUsers=0 PrependPath=1
if exist "%temp%\python_installer.exe" del "%temp%\python_installer.exe"

REM 설치가 성공했는지 및 경로 재설정
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set "PATH=%LocalAppData%\Programs\Python\Python312;%LocalAppData%\Programs\Python\Python312\Scripts;%PATH%"
    echo [성공] Python이 자동으로 설치 완료되었습니다.
    goto has_python
)

:installer_fail
echo [오류] Python 자동 설치에 실패했습니다.
echo 아래 공식 사이트에서 Python을 수동으로 설치해 주세요:
echo https://www.python.org/downloads/
goto end

:has_python
echo [정보] Python 환경이 준비되었습니다.

REM 2. 필수 라이브러리 설치 확인 및 설치
echo [진행] 필수 라이브러리 설치 상태 확인 중...
python -c "import openpyxl, msoffcrypto" >nul 2>&1
if %errorlevel% neq 0 (
    echo [정보] 필수 라이브러리가 누락되었습니다. 자동 설치를 진행합니다...
    pip install openpyxl msoffcrypto-tool
    if %errorlevel% neq 0 (
        echo [오류] 라이브러리 설치에 실패했습니다. 인터넷 연결 및 권한을 확인해 주세요.
        goto end
    )
) else (
    echo [정보] 모든 필수 라이브러리가 이미 설치되어 있습니다.
)

echo.
echo [진행] 주간예배출결 취합 스크립트를 실행합니다...
echo.

REM 3. 파이썬 취합 스크립트 실행
cd /d "%~dp0"
python merge_attendance.py

:end
echo.
echo ==================================================
echo 프로그램이 종료되었습니다. 아무 키나 누르면 창이 닫힙니다.
echo ==================================================
pause >nul
