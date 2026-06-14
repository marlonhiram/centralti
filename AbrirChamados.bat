@echo off
title Central de Chamados TI
echo.
echo  Abrindo Central de Chamados TI...
echo.

:: Aguarda 1 segundo e abre no navegador padrao
timeout /t 1 /nobreak >nul
start "" "http://localhost:5173"

exit
