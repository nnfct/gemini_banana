#!/usr/bin/env python3
"""
Simple CSV re-encoder utility.

Purpose: Fix mojibake (garbled Korean) by converting CSV files to UTF-8.

Usage examples (repo root):
  python backend_py/tools/convert_csv_encoding.py --input "real_data/man/musinsa_man_top.csv" --inplace
  python backend_py/tools/convert_csv_encoding.py --input "real_data/man/*.csv" --inplace

Notes: Tries encodings in order: utf-8-sig, utf-8, cp949, euc-kr, latin1.
"""
from __future__ import annotations

import argparse
import glob
from pathlib import Path


ENCODINGS = ["utf-8-sig", "utf-8", "cp949", "euc-kr", "latin1"]


def detect_and_read(p: Path) -> str:
    last_err = None
    for enc in ENCODINGS:
        try:
            data = p.read_text(encoding=enc)
            print(f"[ENC] {p} -> {enc}")
            return data
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Failed to read {p}: {last_err}")


def write_utf8(p: Path, data: str):
    p.write_text(data, encoding="utf-8")
    print(f"[OUT] {p} (utf-8)")


def main():
    ap = argparse.ArgumentParser(description="Convert CSV encoding to UTF-8")
    ap.add_argument("--input", "-i", nargs="+", required=True, help="Input file pattern(s)")
    ap.add_argument("--output", "-o", help="Output file path (single input only)")
    ap.add_argument("--inplace", action="store_true", help="Overwrite input files")
    args = ap.parse_args()

    # Expand globs
    files = []
    for pat in args.input:
        files.extend([Path(x) for x in glob.glob(pat, recursive=True)])
    if not files:
        print("[WARN] No files matched")
        return 1

    if args.output and (len(files) != 1):
        raise SystemExit("--output can be used only with a single input file")

    for f in files:
        data = detect_and_read(f)
        if args.inplace:
            write_utf8(f, data)
        else:
            out = Path(args.output) if args.output else f.with_suffix(f.suffix + ".utf8.csv")
            write_utf8(out, data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

