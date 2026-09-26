@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Nuvexa Pro 白屏一键修复

set "APPDIR=%LOCALAPPDATA%\Programs\NuvexaPro"
set "EXE=%APPDIR%\NuvexaPro.exe"
set "REPAIR=%TEMP%\nuvexa-white-screen-repair.js"
set "LOG=%TEMP%\NuvexaPro-white-screen-repair.log"
set "JSURL=https://raw.githubusercontent.com/dalulu05168/my-software-releases/main/nuvexa-hotfix/repair-white-screen.js"

echo ============================================================
echo   Nuvexa Pro 白屏一键修复
echo ============================================================
echo.

if not exist "%EXE%" (
  echo [失败] 未找到 Nuvexa Pro：
  echo %EXE%
  echo.
  pause
  exit /b 2
)

echo [1/5] 关闭 Nuvexa Pro 和残留监控进程...
taskkill /IM NuvexaPro.exe /F >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$targets=Get-CimInstance Win32_Process ^| Where-Object { $_.CommandLine -match 'group-monitor\\src\\index\.js|monitor-supervisor\.mjs' }; foreach($p in $targets){ try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {} }" >nul 2>&1

echo [2/5] 下载白屏修复器...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -UseBasicParsing -Uri '%JSURL%' -OutFile '%REPAIR%'" >>"%LOG%" 2>&1
if errorlevel 1 (
  echo [失败] 无法下载修复器。日志：
  echo %LOG%
  pause
  exit /b 3
)

echo [3/5] 修复当前已安装版本...
set "ELECTRON_RUN_AS_NODE=1"
"%EXE%" "%REPAIR%" "%APPDIR%" >>"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
set "ELECTRON_RUN_AS_NODE="
if not "%RC%"=="0" (
  echo [失败] 修复程序返回错误码 %RC%
  echo 日志：%LOG%
  echo.
  type "%LOG%"
  pause
  exit /b %RC%
)

echo [4/5] 清理残留 group-monitor 锁文件...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root=Join-Path $env:APPDATA 'Nuvexa'; if(Test-Path $root){ Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue ^| Where-Object { $_.Name -match '(group|monitor).*(lock|pid)|(lock|pid).*(group|monitor)' } ^| Remove-Item -Force -ErrorAction SilentlyContinue }" >>"%LOG%" 2>&1

echo [5/5] 重新启动 Nuvexa Pro...
start "" "%EXE%"

echo.
echo 已完成：白屏路由保护 + 残留监控进程/锁清理。
echo 原 app.asar 已自动备份，用户数据库和账号数据没有删除。
echo 日志：%LOG%
echo.
timeout /t 3 /nobreak >nul
exit /b 0
