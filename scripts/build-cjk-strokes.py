#!/usr/bin/env python3
"""Download MakeMeAHanzi graphics.txt and build compact CJK medians & outlines JSON files."""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.request
from pathlib import Path

GRAPHICS_URL = (
    "https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt"
)
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = ROOT / "public" / "data"


def fetch_graphics_lines(url: str) -> list[str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "penova-cjk-builder"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read().decode("utf-8").splitlines()
    except Exception:
        proxy = (
            os.environ.get("HTTPS_PROXY")
            or os.environ.get("HTTP_PROXY")
            or "http://127.0.0.1:7890"
        )
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({"http": proxy, "https": proxy})
        )
        req = urllib.request.Request(url, headers={"User-Agent": "penova-cjk-builder"})
        with opener.open(req, timeout=60) as resp:
            return resp.read().decode("utf-8").splitlines()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Optional local graphics.txt path")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    args = parser.parse_args()

    lines = (
        args.input.read_text(encoding="utf-8").splitlines()
        if args.input
        else fetch_graphics_lines(GRAPHICS_URL)
    )

    medians_map: dict[str, list[list[int]]] = {}
    outlines_map: dict[str, list[str]] = {}

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        entry = json.loads(line)
        ch = entry.get("character", "")
        raw_medians = entry.get("medians") or []
        raw_strokes = entry.get("strokes") or []
        if not ch or not raw_medians:
            continue

        flat_medians: list[list[int]] = []
        for stroke_pts in raw_medians:
            if not stroke_pts:
                continue
            flat: list[int] = []
            for pt in stroke_pts:
                if len(pt) < 2:
                    continue
                x = int(round(pt[0]))
                y_top_down = int(round(900 - pt[1]))
                flat.append(x)
                flat.append(y_top_down)
            if len(flat) >= 4:
                flat_medians.append(flat)
            elif len(flat) == 2:
                flat_medians.append([flat[0], flat[1], flat[0] + 10, flat[1] + 10])

        if flat_medians:
            medians_map[ch] = flat_medians
        if raw_strokes:
            outlines_map[ch] = [
                re.sub(r"\s+", " ", str(d)).strip() for d in raw_strokes
            ]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    medians_path = args.out_dir / "cjk-medians.json"
    outlines_path = args.out_dir / "cjk-outlines.json"

    medians_path.write_text(
        json.dumps(medians_map, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    outlines_path.write_text(
        json.dumps(outlines_map, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(
        f"Built CJK stroke data: {len(medians_map)} chars "
        f"-> {medians_path.name} ({medians_path.stat().st_size:,} bytes), "
        f"{outlines_path.name} ({outlines_path.stat().st_size:,} bytes)"
    )


if __name__ == "__main__":
    main()
