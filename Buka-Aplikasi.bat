@echo off
title Chreswill MBG
cd /d "%~dp0"
echo Membuka Chreswill MBG di http://localhost:5180
echo Biarkan jendela ini terbuka selama aplikasi dipakai.
start "" http://localhost:5180/index.html
python -m http.server 5180
