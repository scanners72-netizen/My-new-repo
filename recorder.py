"""
Audio recording module using sounddevice.
Records audio from the default microphone into a numpy array.
"""
import threading
import numpy as np

try:
    import sounddevice as sd
except ImportError:
    sd = None


class AudioRecorder:
    """Records audio in a background thread until stop() is called."""

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self._frames: list[np.ndarray] = []
        self._recording = False
        self._thread: threading.Thread | None = None
        self._stream = None

    def start(self) -> None:
        if sd is None:
            raise RuntimeError("sounddevice is not installed. Run: pip install sounddevice")
        if self._recording:
            return
        self._frames = []
        self._recording = True
        self._thread = threading.Thread(target=self._record_loop, daemon=True)
        self._thread.start()

    def stop(self) -> np.ndarray:
        """Stop recording and return the recorded audio as a float32 numpy array."""
        self._recording = False
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None
        if not self._frames:
            return np.zeros(0, dtype=np.float32)
        audio = np.concatenate(self._frames, axis=0)
        # Ensure mono
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return audio.astype(np.float32)

    def _record_loop(self) -> None:
        chunk_size = 1024
        with sd.InputStream(
            samplerate=self.sample_rate,
            channels=1,
            dtype="float32",
            blocksize=chunk_size,
        ) as stream:
            while self._recording:
                data, _ = stream.read(chunk_size)
                self._frames.append(data.copy())

    @property
    def is_recording(self) -> bool:
        return self._recording
