"""
Global hotkey management using the `keyboard` library.
Registers a system-wide hotkey that fires a callback regardless of which
window is currently in focus.
"""
import threading
from typing import Callable

try:
    import keyboard
except ImportError:
    keyboard = None


class HotkeyManager:
    """
    Registers a single global toggle hotkey.

    The callback is called in a separate thread so it never blocks the
    hotkey listener.
    """

    def __init__(self, hotkey: str, callback: Callable[[], None]):
        self.hotkey = hotkey
        self.callback = callback
        self._registered = False

    def start(self) -> None:
        if keyboard is None:
            raise RuntimeError(
                "keyboard library is not installed.\n"
                "Run: pip install keyboard"
            )
        if self._registered:
            return
        keyboard.add_hotkey(self.hotkey, self._fire, suppress=True)
        self._registered = True

    def stop(self) -> None:
        if keyboard and self._registered:
            try:
                keyboard.remove_hotkey(self.hotkey)
            except Exception:
                pass
            self._registered = False

    def update_hotkey(self, new_hotkey: str, callback: Callable[[], None] | None = None) -> None:
        self.stop()
        self.hotkey = new_hotkey
        if callback:
            self.callback = callback
        self.start()

    def _fire(self) -> None:
        threading.Thread(target=self.callback, daemon=True).start()
