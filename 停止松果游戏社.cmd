@echo off
chcp 65001 >nul
title 停止 PINECONE CLUB
"D:\codexAI\.toolchains\powershell\pwsh.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
echo.
pause