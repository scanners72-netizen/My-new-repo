"""
System tray icon for Voice Input App.
Shows a microphone icon; changes colour while recording.
Right-click menu: Language, Model, Settings, Exit.
"""
import threading
from typing import Callable

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None

try:
    import pystray
except ImportError:
    pystray = None


# ---------------------------------------------------------------------------
# Icon generation
# ---------------------------------------------------------------------------

def _draw_mic_icon(size: int = 64, recording: bool = False) -> "Image.Image":
    """Draw a simple microphone icon. Red when recording, white when idle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    bg_color = (220, 50, 50, 255) if recording else (50, 50, 50, 200)
    mic_color = (255, 255, 255, 255)

    # Background circle
    draw.ellipse([0, 0, size - 1, size - 1], fill=bg_color)

    s = size / 64  # scale factor

    # Microphone body (rounded rectangle)
    mx1, my1 = int(22 * s), int(8 * s)
    mx2, my2 = int(42 * s), int(36 * s)
    radius = int(10 * s)
    draw.rounded_rectangle([mx1, my1, mx2, my2], radius=radius, fill=mic_color)

    # Stand arc (bottom half circle)
    ax1, ay1 = int(14 * s), int(24 * s)
    ax2, ay2 = int(50 * s), int(50 * s)
    draw.arc([ax1, ay1, ax2, ay2], start=0, end=180, fill=mic_color, width=int(3 * s))

    # Vertical post
    cx = size // 2
    draw.line([(cx, int(47 * s)), (cx, int(56 * s))], fill=mic_color, width=int(3 * s))

    # Base horizontal line
    draw.line(
        [(int(22 * s), int(56 * s)), (int(42 * s), int(56 * s))],
        fill=mic_color,
        width=int(3 * s),
    )

    return img


# ---------------------------------------------------------------------------
# Tray application
# ---------------------------------------------------------------------------

class TrayApp:
    def __init__(
        self,
        on_toggle: Callable[[], None],
        on_open_settings: Callable[[], None],
        on_exit: Callable[[], None],
    ):
        self._on_toggle = on_toggle
        self._on_open_settings = on_open_settings
        self._on_exit = on_exit
        self._icon: "pystray.Icon | None" = None
        self._recording = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the tray icon (blocks until the icon is stopped)."""
        if pystray is None or Image is None:
            raise RuntimeError(
                "pystray or Pillow not installed.\n"
                "Run: pip install pystray pillow"
            )
        self._icon = pystray.Icon(
            name="VoiceInput",
            icon=_draw_mic_icon(recording=False),
            title="Голосовой ввод / קלט קולי",
            menu=self._build_menu(),
        )
        self._icon.run()

    def stop(self) -> None:
        if self._icon:
            self._icon.stop()

    def set_recording(self, recording: bool) -> None:
        self._recording = recording
        if self._icon:
            self._icon.icon = _draw_mic_icon(recording=recording)
            status = "Запись... / מקליט..." if recording else "Голосовой ввод / קלט קולי"
            self._icon.title = status

    def notify(self, title: str, message: str) -> None:
        if self._icon:
            try:
                self._icon.notify(message, title)
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Menu
    # ------------------------------------------------------------------

    def _build_menu(self) -> "pystray.Menu":
        return pystray.Menu(
            pystray.MenuItem(
                "Начать / Остановить запись\nהתחל / עצור הקלטה",
                lambda icon, item: threading.Thread(
                    target=self._on_toggle, daemon=True
                ).start(),
                default=True,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Настройки / הגדרות",
                lambda icon, item: threading.Thread(
                    target=self._on_open_settings, daemon=True
                ).start(),
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Выйти / יציאה",
                lambda icon, item: self._on_exit(),
            ),
        )
