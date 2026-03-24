"""
Text injection module.
Injects recognized text into the currently active text field using the clipboard.

Strategy:
  1. Save current clipboard contents.
  2. Place transcribed text into clipboard.
  3. Simulate Ctrl+V (paste).
  4. Restore original clipboard contents after a short delay.

This works universally in virtually all Windows applications (browsers, Office,
Notepad, chat apps, etc.) and correctly handles RTL languages like Hebrew.
"""
import time
import threading


def inject_text(text: str) -> None:
    """Paste *text* at the current cursor position in the active window."""
    if not text:
        return

    try:
        import pyperclip
        import pyautogui
    except ImportError as exc:
        raise RuntimeError(
            f"Missing dependency: {exc}.\n"
            "Run: pip install pyperclip pyautogui"
        ) from exc

    # Save original clipboard
    try:
        original = pyperclip.paste()
    except Exception:
        original = ""

    try:
        pyperclip.copy(text)
        time.sleep(0.05)  # let clipboard settle
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.1)
    finally:
        # Restore clipboard asynchronously so the paste can complete first
        def _restore():
            time.sleep(0.5)
            try:
                pyperclip.copy(original)
            except Exception:
                pass

        threading.Thread(target=_restore, daemon=True).start()
