@echo off
title Spotify Download Server
echo Starting Spotify Download Server...
echo.
echo Server will run on http://localhost:3001
echo Base download path: D:\HISYAM\Music\Spotify Downloads
echo.
echo Press Ctrl+C to stop the server
echo.
node "%~dp0download-server.js"
pause
