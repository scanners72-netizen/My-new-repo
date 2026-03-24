@echo off
REM ============================================================
REM  Voice Input App — запуск / start
REM ============================================================

REM Run without console window
pythonw main.py

REM If pythonw is not available, fall back to python
if errorlevel 1 (
    python main.py
)
