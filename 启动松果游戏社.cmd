@echo off
chcp 65001 >nul
title 启动 PINECONE CLUB
"D:\codexAI\.toolchains\powershell\pwsh.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1"
echo.
pause