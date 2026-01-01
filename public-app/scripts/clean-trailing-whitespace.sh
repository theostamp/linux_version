#!/bin/bash
set -euo pipefail

echo "Cleaning trailing whitespace and extra blank lines from source files..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/../src"

TARGET_DIR="$TARGET_DIR" python3 - <<'PY'
import os
from pathlib import Path

target_dir = Path(os.environ["TARGET_DIR"])
extensions = {".ts", ".tsx", ".js", ".jsx"}

for path in target_dir.rglob("*"):
    if not path.is_file() or path.suffix not in extensions:
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    lines = [line.rstrip(" \t") for line in lines]
    while lines and lines[-1] == "":
        lines.pop()
    content = "\n".join(lines) + "\n"
    path.write_text(content, encoding="utf-8")
PY

echo "Done! Trailing whitespace and blank lines cleaned."
