# Голосовой ввод / Voice Input App

Windows-приложение для голосового ввода текста **на русском и иврите** в любом поле любой программы.

Windows application for voice text input **in Russian and Hebrew** in any text field of any application.

---

## Как это работает / How it works

1. Приложение работает в **системном трее** (значок в углу панели задач).
2. Нажмите **горячую клавишу** (по умолчанию `Windows+Space`) в любом месте — в браузере, Word, мессенджере, поле поиска — не важно.
3. Скажите что хотите напечатать.
4. Нажмите горячую клавишу снова — текст автоматически вставится в активное поле.

---

1. The app lives in the **system tray** (taskbar corner icon).
2. Press the **hotkey** (default `Windows+Space`) anywhere — browser, Word, messenger, search box — doesn't matter.
3. Say what you want to type.
4. Press the hotkey again — the text is automatically pasted into the active field.

---

## Возможности / Features

- Поддержка **русского** и **иврита** (RTL работает корректно)
- **Автоопределение языка** или ручной выбор
- Работает в **любом приложении** — браузер, Office, Telegram, и т.д.
- Локальное распознавание через **OpenAI Whisper** — интернет не нужен, ключи API не нужны
- Настраиваемая горячая клавиша
- Выбор модели Whisper (tiny → large) для баланса скорость/качество
- Иконка меняет цвет во время записи

---

- Supports **Russian** and **Hebrew** (RTL handled correctly)
- **Auto language detection** or manual selection
- Works in **any application** — browser, Office, Telegram, etc.
- Local recognition via **OpenAI Whisper** — no internet, no API keys
- Configurable hotkey
- Whisper model selection (tiny → large) for speed/quality balance
- Tray icon turns red while recording

---

## Требования / Requirements

- Windows 10 / 11
- Python 3.10 или новее (скачать с https://www.python.org/downloads/)
- Микрофон

---

## Установка / Installation

```bat
REM 1. Клонировать репозиторий / Clone the repository
git clone https://github.com/scanners72-netizen/my-new-repo.git
cd my-new-repo

REM 2. Запустить установку / Run setup
setup.bat
```

`setup.bat` выполнит:
- Установку всех зависимостей через pip
- Загрузку модели Whisper `base` (~145 MB, один раз)

---

## Запуск / Running

```bat
run.bat
```

Или напрямую / Or directly:

```bash
python main.py
```

---

## Настройки / Settings

Правый клик на иконку в трее → **Настройки / הגדרות**

| Параметр | По умолчанию | Описание |
|----------|-------------|----------|
| Горячая клавиша | `windows+space` | Например: `ctrl+shift+r`, `f9` |
| Язык | Авто | Авто, Русский, עברית |
| Модель | `base` | tiny (быстро) / base / small / medium / large (качество) |
| Макс. длина записи | 30 сек | Запись остановится автоматически |

---

## Структура проекта / Project Structure

```
main.py             — точка входа, оркестратор
recorder.py         — запись аудио (sounddevice)
transcriber.py      — распознавание речи (Whisper)
injector.py         — вставка текста через буфер обмена
hotkey_manager.py   — глобальная горячая клавиша
tray_app.py         — иконка системного трея (pystray)
settings_window.py  — окно настроек (tkinter)
config.py           — загрузка/сохранение конфигурации
requirements.txt    — зависимости Python
setup.bat           — установка
run.bat             — запуск
```

---

## Зависимости / Dependencies

| Библиотека | Назначение |
|-----------|-----------|
| `openai-whisper` | Локальное распознавание речи |
| `sounddevice` | Запись с микрофона |
| `numpy` | Обработка аудио |
| `pyperclip` | Работа с буфером обмена |
| `pyautogui` | Симуляция Ctrl+V |
| `keyboard` | Глобальные горячие клавиши |
| `pystray` | Иконка системного трея |
| `Pillow` | Отрисовка иконки |

---

## Часто задаваемые вопросы / FAQ

**Долго распознаёт первый раз?**
При первом запуске Whisper загружает модель в память (~несколько секунд). Последующие распознавания быстрее. Модель `tiny` работает быстрее, `small`/`medium` дают лучшее качество для иврита.

**Не вставляется текст?**
Некоторые приложения с защитой (банки, антишпионы) блокируют Ctrl+V. В таком случае вручную вставьте из буфера обмена (текст там уже есть).

**Нужен ли интернет?**
Нет. Whisper работает полностью локально.

**Поддерживается ли иврит (RTL)?**
Да. Whisper хорошо распознаёт иврит, а вставка через буфер обмена корректно передаёт Unicode/RTL.
