@echo off
title Stop Spotify Download Server
echo Stopping Spotify Download Server...
node "%~dp0server-manager.js" --stop
echo.
echo Server stopped successfully!
pause
