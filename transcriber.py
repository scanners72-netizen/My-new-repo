"""
Speech-to-text transcription using OpenAI Whisper (runs locally, no API key needed).
Supports Russian (ru) and Hebrew (he) with auto-detection.
"""
import numpy as np
from typing import Callable

_whisper = None  # lazy-loaded


def _get_whisper():
    global _whisper
    if _whisper is None:
        try:
            import whisper
            _whisper = whisper
        except ImportError:
            raise RuntimeError(
                "openai-whisper is not installed.\n"
                "Run: pip install openai-whisper"
            )
    return _whisper


class Transcriber:
    """
    Wraps OpenAI Whisper for speech-to-text.

    Languages supported: auto-detect, Russian ('ru'), Hebrew ('he').
    Models (quality vs speed): tiny < base < small < medium < large
    Recommended: 'base' for speed, 'small' for better accuracy.
    """

    def __init__(self, model_name: str = "base", language: str = "auto"):
        self.model_name = model_name
        self.language = language  # "auto", "ru", "he"
        self._model = None
        self._on_status: Callable[[str], None] | None = None

    def set_status_callback(self, callback: Callable[[str], None]) -> None:
        self._on_status = callback

    def _status(self, msg: str) -> None:
        if self._on_status:
            self._on_status(msg)

    def load_model(self) -> None:
        """Load the Whisper model into memory (call once at startup)."""
        if self._model is not None:
            return
        whisper = _get_whisper()
        self._status(f"Загрузка модели Whisper '{self.model_name}'...")
        self._model = whisper.load_model(self.model_name)
        self._status("Модель загружена.")

    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> str:
        """
        Transcribe audio numpy array (float32, mono) to text.
        Returns the transcribed string (may be empty if silence/noise).
        """
        if self._model is None:
            self.load_model()

        if audio is None or len(audio) == 0:
            return ""

        # Whisper expects float32 audio at 16kHz
        if sample_rate != 16000:
            audio = _resample(audio, sample_rate, 16000)

        # Normalise if needed
        max_val = np.abs(audio).max()
        if max_val > 0:
            audio = audio / max_val

        whisper = _get_whisper()

        options: dict = {
            "fp16": False,
            "task": "transcribe",
        }

        if self.language != "auto":
            options["language"] = self.language

        self._status("Распознавание речи...")
        result = self._model.transcribe(audio, **options)
        text: str = result.get("text", "").strip()
        self._status("Готово.")
        return text

    def set_model(self, model_name: str) -> None:
        """Change model (reloads on next transcribe call)."""
        if model_name != self.model_name:
            self.model_name = model_name
            self._model = None

    def set_language(self, language: str) -> None:
        self.language = language


def _resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Simple linear resampling."""
    try:
        import scipy.signal
        return scipy.signal.resample_poly(
            audio, target_sr, orig_sr
        ).astype(np.float32)
    except ImportError:
        # Fallback: numpy interpolation
        duration = len(audio) / orig_sr
        target_len = int(duration * target_sr)
        x_orig = np.linspace(0, 1, len(audio))
        x_target = np.linspace(0, 1, target_len)
        return np.interp(x_target, x_orig, audio).astype(np.float32)
