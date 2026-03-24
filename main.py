"""
Voice Input App — main entry point.
Runs as a Windows system-tray application.

Usage:
    python main.py

Hotkey (default Ctrl+Alt+Space):
  - First press  → starts recording
  - Second press → stops recording, transcribes, pastes text at cursor
"""
import sys
import threading
import time

from config import load_config, save_config
from recorder import AudioRecorder
from transcriber import Transcriber
from injector import inject_text
from hotkey_manager import HotkeyManager
from tray_app import TrayApp
from settings_window import SettingsWindow


class VoiceInputApp:
    def __init__(self):
        self._config = load_config()
        self._recorder = AudioRecorder(sample_rate=self._config["sample_rate"])
        self._transcriber = Transcriber(
            model_name=self._config["model"],
            language=self._config["language"],
        )
        self._transcriber.set_status_callback(self._on_status)

        self._hotkey_mgr = HotkeyManager(
            hotkey=self._config["hotkey"],
            callback=self._toggle_recording,
        )
        self._tray = TrayApp(
            on_toggle=self._toggle_recording,
            on_open_settings=self._open_settings,
            on_exit=self._exit,
        )
        self._lock = threading.Lock()
        self._running = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def run(self) -> None:
        self._running = True
        # Pre-load Whisper model in background so first use is fast
        threading.Thread(target=self._preload_model, daemon=True).start()
        # Register global hotkey
        self._hotkey_mgr.start()
        # Start tray (blocks until exit)
        self._tray.start()

    def _preload_model(self) -> None:
        try:
            self._transcriber.load_model()
        except Exception as exc:
            self._tray.notify("Ошибка / שגיאה", str(exc))

    # ------------------------------------------------------------------
    # Recording toggle
    # ------------------------------------------------------------------

    def _toggle_recording(self) -> None:
        with self._lock:
            if self._recorder.is_recording:
                self._stop_and_transcribe()
            else:
                self._start_recording()

    def _start_recording(self) -> None:
        max_sec = self._config.get("max_recording_seconds", 30)
        self._recorder.start()
        self._tray.set_recording(True)
        self._tray.notify(
            "Запись / הקלטה",
            f"Говорите... (макс. {max_sec} сек)\nדברו... (מקס. {max_sec} שניות)",
        )
        # Auto-stop after max_recording_seconds
        threading.Thread(
            target=self._auto_stop, args=(max_sec,), daemon=True
        ).start()

    def _auto_stop(self, max_sec: int) -> None:
        deadline = time.time() + max_sec
        while time.time() < deadline:
            if not self._recorder.is_recording:
                return
            time.sleep(0.1)
        # Time's up — stop automatically
        with self._lock:
            if self._recorder.is_recording:
                self._stop_and_transcribe()

    def _stop_and_transcribe(self) -> None:
        audio = self._recorder.stop()
        self._tray.set_recording(False)

        if audio is None or len(audio) < self._config["sample_rate"] * 0.3:
            # Less than 0.3 seconds → ignore
            self._tray.notify("Голосовой ввод / קלט קולי", "Слишком коротко / קצר מדי")
            return

        # Transcribe in the current thread (already in a background thread)
        try:
            text = self._transcriber.transcribe(audio, self._config["sample_rate"])
        except Exception as exc:
            self._tray.notify("Ошибка / שגיאה", str(exc))
            return

        if not text:
            self._tray.notify("Голосовой ввод / קלט קולי", "Речь не распознана / לא זוהתה דיבור")
            return

        try:
            inject_text(text)
            # Show first 60 chars in notification
            preview = text[:60] + ("…" if len(text) > 60 else "")
            self._tray.notify("Вставлено / הוכנס", preview)
        except Exception as exc:
            self._tray.notify("Ошибка вставки / שגיאת הדבקה", str(exc))

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------

    def _open_settings(self) -> None:
        win = SettingsWindow(config=self._config, on_save=self._apply_settings)
        win.show()

    def _apply_settings(self, new_config: dict) -> None:
        old_hotkey = self._config.get("hotkey")
        self._config = new_config
        save_config(new_config)

        self._transcriber.set_model(new_config["model"])
        self._transcriber.set_language(new_config["language"])

        if new_config["hotkey"] != old_hotkey:
            self._hotkey_mgr.update_hotkey(new_config["hotkey"])

    # ------------------------------------------------------------------
    # Status / Exit
    # ------------------------------------------------------------------

    def _on_status(self, message: str) -> None:
        # Update tray tooltip with transcription status
        if self._tray._icon:
            try:
                self._tray._icon.title = message
            except Exception:
                pass

    def _exit(self) -> None:
        if self._recorder.is_recording:
            self._recorder.stop()
        self._hotkey_mgr.stop()
        self._tray.stop()
        self._running = False


def main() -> None:
    # Windows DPI awareness (makes UI crisp on high-DPI screens)
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass

    app = VoiceInputApp()
    app.run()


if __name__ == "__main__":
    main()
