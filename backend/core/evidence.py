"""Evidence package helpers."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from typing import Iterable


def stable_json_bytes(data) -> bytes:
    return json.dumps(
        data,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def sha256_hex_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def build_audit_root_hash(event_hashes: Iterable[str]) -> str:
    hashes = [h for h in event_hashes if h]
    if not hashes:
        return ""
    joined = "".join(hashes).encode("utf-8")
    return hashlib.sha256(joined).hexdigest()


def build_zip_bytes(files: list[tuple[str, bytes]]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files:
            zf.writestr(name, content)
    return buffer.getvalue()
