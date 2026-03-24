"""
Configuration management for Voice Input App.
"""
import json
from pathlib import Path

DEFAULT_CONFIG = {
    "hotkey": "ctrl+alt+space",
    "language": "auto",       # "auto", "ru" (Russian), "he" (Hebrew)
    "model": "base",          # whisper model: tiny, base, small, medium, large
    "sample_rate": 16000,
    "max_recording_seconds": 30,
    "inject_method": "clipboard",  # only "clipboard" supported currently
    "notification_sound": True,
}

CONFIG_PATH = Path.home() / ".voice_input_app" / "config.json"


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, encoding="utf-8") as f:
                saved = json.load(f)
            cfg = DEFAULT_CONFIG.copy()
            cfg.update(saved)
            return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def save_config(config: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
