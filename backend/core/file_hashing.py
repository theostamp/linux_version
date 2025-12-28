"""
File hashing utilities.

Used to prevent duplicate uploads (same content) across various modules.
"""

from __future__ import annotations

import hashlib
from typing import Protocol


class _ChunkableFile(Protocol):
    def chunks(self, chunk_size: int | None = None): ...
    def seek(self, pos: int, whence: int = 0): ...
    def tell(self) -> int: ...


def sha256_hexdigest(uploaded_file: _ChunkableFile) -> str:
    """
    Compute SHA-256 hex digest for a Django UploadedFile-like object.

    Important: restores the original file pointer position to avoid breaking subsequent save().
    """
    hasher = hashlib.sha256()

    original_pos: int | None = None
    try:
        original_pos = uploaded_file.tell()
    except Exception:
        original_pos = None

    try:
        try:
            uploaded_file.seek(0)
        except Exception:
            # Some file-like objects may not support seek; hashing will still work via chunks()
            pass

        for chunk in uploaded_file.chunks():
            hasher.update(chunk)
    finally:
        if original_pos is not None:
            try:
                uploaded_file.seek(original_pos)
            except Exception:
                pass

    return hasher.hexdigest()


