"""
Speech-to-text transcription using faster-whisper (runs locally, no API key needed).
Supports Russian (ru) and Hebrew (he) with auto-detection.
faster-whisper is 2-4x faster than openai-whisper on CPU via int8 quantization.
"""
import numpy as np
from typing import Callable

_faster_whisper = None  # lazy-loaded


def _get_faster_whisper():
    global _faster_whisper
    if _faster_whisper is None:
        try:
            import faster_whisper
            _faster_whisper = faster_whisper
        except ImportError:
            raise RuntimeError(
                "faster-whisper is not installed.\n"
                "Run: pip install faster-whisper"
            )
    return _faster_whisper


class Transcriber:
    """
    Wraps faster-whisper for speech-to-text.

    Languages supported: auto-detect, Russian ('ru'), Hebrew ('he').
    Models (quality vs speed): tiny < base < small < medium < large
    Recommended: 'base' for speed, 'small' for better accuracy.
    Uses int8 quantization for maximum CPU performance.
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
        fw = _get_faster_whisper()
        self._status(f"Загрузка модели Whisper '{self.model_name}'...")
        self._model = fw.WhisperModel(
            self.model_name,
            device="cpu",
            compute_type="int8",  # fastest on CPU
        )
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

        # faster-whisper expects float32 audio at 16kHz
        if sample_rate != 16000:
            audio = _resample(audio, sample_rate, 16000)

        # Normalise if needed
        max_val = np.abs(audio).max()
        if max_val > 0:
            audio = audio / max_val

        lang = None if self.language == "auto" else self.language

        self._status("Распознавание речи...")
        segments, _ = self._model.transcribe(
            audio,
            language=lang,
            task="transcribe",
            beam_size=5,
            vad_filter=True,  # skip silence automatically
        )
        text = " ".join(seg.text for seg in segments).strip()
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
