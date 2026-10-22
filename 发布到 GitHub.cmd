@echo off
chcp 65001 >nul
title PINECONE CLUB PUBLISH
"D:\codexAI\.toolchains\powershell\pwsh.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish.ps1"
echo.
pause