@echo off
REM ============================================================
REM  Voice Input App — Setup Script
REM  Installs all Python dependencies including faster-whisper.
REM  Run once before first use.
REM ============================================================

echo ============================================================
echo  Голосовой ввод — Установка / Voice Input App — Setup
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python не найден / Python not found.
    echo Установите Python 3.10+ с https://www.python.org/downloads/
    echo Install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Обновление pip / Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [2/3] Установка зависимостей / Installing dependencies...
pip install -r requirements.txt

echo.
echo [3/3] Загрузка модели Whisper 'base' / Downloading Whisper 'base' model...
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Model ready.')"

echo.
echo ============================================================
echo  Готово! Запустите run.bat чтобы начать.
echo  Done! Run run.bat to start the app.
echo ============================================================
pause
