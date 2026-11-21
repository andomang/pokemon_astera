@echo off
chcp 65001 >nul
rem 포켓몬스터 아스테라 실행기
rem 파이썬이 있으면 로컬 서버로 실행(가장 안정적), 없으면 index.html을 바로 엽니다.
cd /d "%~dp0.."
where python >nul 2>nul
if %errorlevel%==0 (
  start "" /min python -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/pokemon/index.html"
) else (
  start "" "%~dp0index.html"
)
