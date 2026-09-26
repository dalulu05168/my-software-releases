@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Nuvexa Pro 白屏修复 + 自动验收

set "APPDIR=%LOCALAPPDATA%\Programs\NuvexaPro"
set "EXE=%APPDIR%\NuvexaPro.exe"
set "PATCH=%TEMP%\nuvexa-patch-white-screen.js"
set "TEST=%TEMP%\nuvexa-ui-smoke-test.js"
set "BASE=https://raw.githubusercontent.com/dalulu05168/my-software-releases/main/nuvexa-hotfix"

echo ============================================================
echo   Nuvexa Pro 白屏修复 + 自动验收
echo ============================================================
echo.

if not exist "%EXE%" (
  echo [失败] 未找到 NuvexaPro.exe
  echo %EXE%
  pause
  exit /b 2
)

echo [1/6] 下载修复器...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%BASE%/patch-white-screen.js' -OutFile '%PATCH%'; Invoke-WebRequest -UseBasicParsing '%BASE%/ui-smoke-test.js' -OutFile '%TEST%'"
if errorlevel 1 (
  echo [失败] 修复器下载失败。
  pause
  exit /b 3
)

echo [2/6] 关闭 Nuvexa 和残留监控进程...
taskkill /IM NuvexaPro.exe /F >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ps=Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'group-monitor\\src\\index\.js|monitor-supervisor\.mjs' }; foreach($p in $ps){ try{ Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop }catch{} }"
timeout /t 1 /nobreak >nul

echo [3/6] 修复 app.asar 前端路由...
set "ELECTRON_RUN_AS_NODE=1"
"%EXE%" "%PATCH%" "%APPDIR%"
set "RC=%ERRORLEVEL%"
set "ELECTRON_RUN_AS_NODE="
if not "%RC%"=="0" (
  echo.
  echo [失败] app.asar 修复失败，错误码 %RC%
  echo 日志：%%APPDATA%%\Nuvexa\logs\white-screen-hotfix.log
  pause
  exit /b %RC%
)

echo [4/6] 启动 Nuvexa Pro（测试模式）...
start "" "%EXE%" --remote-debugging-port=9228
timeout /t 6 /nobreak >nul

echo [5/6] 自动切换 8 个主要模块检查白屏...
set "ELECTRON_RUN_AS_NODE=1"
"%EXE%" "%TEST%" 9228
set "TRC=%ERRORLEVEL%"
set "ELECTRON_RUN_AS_NODE="

echo [6/6] 验收结果...
if "%TRC%"=="0" (
  echo.
  echo ============================================
  echo   PASS：8 个主要模块切换均未检测到白屏
  echo ============================================
  echo 详细结果：
  echo %%APPDATA%%\Nuvexa\logs\white-screen-smoke-test.json
  echo.
  pause
  exit /b 0
)
if "%TRC%"=="3" (
  echo.
  echo [需要登录] 当前停留在登录页。
  echo 请正常登录 Nuvexa Pro 后，再双击本文件一次。
  echo 不需要再发任何文件。
  echo.
  pause
  exit /b 3
)

echo.
echo ============================================
echo   FAIL：自动验收仍检测到至少一个模块异常
echo ============================================
echo 详细结果：
echo %%APPDATA%%\Nuvexa\logs\white-screen-smoke-test.json
echo.
echo 本次不会显示“已修复完成”。
pause
exit /b %TRC%
