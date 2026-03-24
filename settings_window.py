"""
Settings window built with tkinter.
Allows the user to configure hotkey, language, and Whisper model.
"""
import tkinter as tk
from tkinter import ttk, messagebox
from typing import Callable

LANGUAGES = {
    "Авто / אוטומטי": "auto",
    "Русский": "ru",
    "עברית (Hebrew)": "he",
}

MODELS = {
    "tiny  (быстро / מהיר)": "tiny",
    "base  (рекомендуется / מומלץ)": "base",
    "small (лучше / טוב יותר)": "small",
    "medium (высокое качество / איכות גבוהה)": "medium",
    "large  (наилучшее / הכי טוב)": "large",
}


class SettingsWindow:
    def __init__(self, config: dict, on_save: Callable[[dict], None]):
        self._config = config.copy()
        self._on_save = on_save
        self._root: tk.Tk | None = None

    def show(self) -> None:
        """Open the settings window (blocks until closed)."""
        if self._root and self._root.winfo_exists():
            self._root.lift()
            return

        root = tk.Tk()
        self._root = root
        root.title("Настройки голосового ввода / הגדרות קלט קולי")
        root.resizable(False, False)
        root.attributes("-topmost", True)

        pad = {"padx": 12, "pady": 6}

        # ---- Hotkey ----
        tk.Label(root, text="Горячая клавиша / מקש קיצור:").grid(
            row=0, column=0, sticky="w", **pad
        )
        hotkey_var = tk.StringVar(value=self._config.get("hotkey", "windows+space"))
        hotkey_entry = tk.Entry(root, textvariable=hotkey_var, width=24)
        hotkey_entry.grid(row=0, column=1, sticky="ew", **pad)

        # ---- Language ----
        tk.Label(root, text="Язык / שפה:").grid(row=1, column=0, sticky="w", **pad)
        lang_display = {v: k for k, v in LANGUAGES.items()}
        lang_var = tk.StringVar(
            value=lang_display.get(self._config.get("language", "auto"), "Авто / אוטומטי")
        )
        lang_combo = ttk.Combobox(
            root, textvariable=lang_var, values=list(LANGUAGES.keys()), state="readonly", width=30
        )
        lang_combo.grid(row=1, column=1, sticky="ew", **pad)

        # ---- Model ----
        tk.Label(root, text="Модель / מודל:").grid(row=2, column=0, sticky="w", **pad)
        model_display = {v: k for k, v in MODELS.items()}
        model_var = tk.StringVar(
            value=model_display.get(self._config.get("model", "base"), "base  (рекомендуется / מומלץ)")
        )
        model_combo = ttk.Combobox(
            root, textvariable=model_var, values=list(MODELS.keys()), state="readonly", width=30
        )
        model_combo.grid(row=2, column=1, sticky="ew", **pad)

        # ---- Max recording seconds ----
        tk.Label(root, text="Макс. длина записи (сек) / אורך הקלטה מקסימלי (שניות):").grid(
            row=3, column=0, sticky="w", **pad
        )
        max_sec_var = tk.IntVar(value=self._config.get("max_recording_seconds", 30))
        max_sec_spin = tk.Spinbox(root, from_=5, to=120, textvariable=max_sec_var, width=6)
        max_sec_spin.grid(row=3, column=1, sticky="w", **pad)

        # ---- Info ----
        info = (
            "Совет: нажмите горячую клавишу, говорите, нажмите снова — текст вставится.\n"
            "טיפ: לחץ על מקש הקיצור, דבר, לחץ שוב — הטקסט יוכנס אוטומטית."
        )
        tk.Label(root, text=info, wraplength=380, justify="left", fg="#555").grid(
            row=4, column=0, columnspan=2, **pad
        )

        # ---- Buttons ----
        btn_frame = tk.Frame(root)
        btn_frame.grid(row=5, column=0, columnspan=2, pady=10)

        def _save():
            new_cfg = self._config.copy()
            new_cfg["hotkey"] = hotkey_var.get().strip().lower()
            new_cfg["language"] = LANGUAGES.get(lang_var.get(), "auto")
            new_cfg["model"] = MODELS.get(model_var.get(), "base")
            new_cfg["max_recording_seconds"] = max_sec_var.get()
            self._on_save(new_cfg)
            messagebox.showinfo(
                "Сохранено / נשמר",
                "Настройки сохранены.\nהגדרות נשמרו.",
                parent=root,
            )
            root.destroy()

        tk.Button(btn_frame, text="Сохранить / שמור", command=_save, width=18).pack(
            side="left", padx=6
        )
        tk.Button(btn_frame, text="Отмена / ביטול", command=root.destroy, width=14).pack(
            side="left", padx=6
        )

        root.mainloop()
        self._root = None
