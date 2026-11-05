#!/usr/bin/env python3
"""Watch a folder for complete CSV files and convert them to formatted JSON."""

import argparse
import csv
import json
import logging
import os
import tempfile
import time
from pathlib import Path


class SourceChangedError(OSError):
    """Raised when a CSV changes while it is being read."""


def file_signature(path):
    stat = path.stat()
    return stat.st_size, stat.st_mtime_ns


def convert_csv_file(csv_path, output_dir, expected_signature=None):
    """Convert one CSV file to a UTF-8, indented JSON array."""
    csv_path = Path(csv_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if expected_signature is not None and file_signature(csv_path) != expected_signature:
        raise SourceChangedError("file changed before conversion began")

    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source, strict=True)
        if reader.fieldnames is None:
            raise ValueError("CSV file is empty or has no header row")
        rows = list(reader)

    if expected_signature is not None and file_signature(csv_path) != expected_signature:
        raise SourceChangedError("file changed while it was being read")

    output_path = output_dir / (csv_path.stem + ".json")
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=output_dir,
            prefix=output_path.name + ".",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(rows, temporary, ensure_ascii=False, indent=2)
            temporary.write("\n")
        os.replace(temporary_path, output_path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()

    return output_path


class FolderWatcher:
    def __init__(self, input_dir, output_dir, settle_seconds, logger):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.settle_seconds = settle_seconds
        self.logger = logger
        self.observed = {}
        self.attempted = {}

    def scan_once(self, now=None):
        if now is None:
            now = time.monotonic()

        csv_files = {
            path
            for path in self.input_dir.iterdir()
            if path.is_file() and path.suffix.lower() == ".csv"
        }
        for missing_path in self.observed.keys() - csv_files:
            self.observed.pop(missing_path, None)
            self.attempted.pop(missing_path, None)

        for csv_path in csv_files:
            try:
                signature = file_signature(csv_path)
            except OSError:
                self.logger.exception("Could not inspect CSV file %s", csv_path)
                continue

            previous = self.observed.get(csv_path)
            if previous is None or previous[0] != signature:
                self.observed[csv_path] = (signature, now)
                continue

            if now - previous[1] < self.settle_seconds:
                continue
            if self.attempted.get(csv_path) == signature:
                continue

            try:
                output_path = convert_csv_file(
                    csv_path, self.output_dir, expected_signature=signature
                )
            except (OSError, UnicodeError, csv.Error, ValueError):
                self.attempted[csv_path] = signature
                self.logger.exception("Failed to convert CSV file %s", csv_path)
            else:
                self.attempted[csv_path] = signature
                self.logger.info("Converted %s to %s", csv_path, output_path)


def create_logger(output_dir):
    log_path = output_dir / "csv_to_json_watcher.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_path, encoding="utf-8"),
        ],
    )
    return logging.getLogger("csv_to_json_watcher")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Watch a folder and convert new CSV files to formatted JSON."
    )
    parser.add_argument("input_dir", type=Path, help="folder to watch for CSV files")
    parser.add_argument("output_dir", type=Path, help="folder for JSON and log files")
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=1.0,
        help="seconds between folder scans (default: 1)",
    )
    parser.add_argument(
        "--settle-seconds",
        type=float,
        default=2.0,
        help="seconds a file must remain unchanged before conversion (default: 2)",
    )
    args = parser.parse_args(argv)
    if args.poll_interval <= 0:
        parser.error("--poll-interval must be greater than zero")
    if args.settle_seconds < 0:
        parser.error("--settle-seconds cannot be negative")
    return args


def main(argv=None):
    args = parse_args(argv)
    if not args.input_dir.is_dir():
        raise SystemExit("Input folder does not exist: {}".format(args.input_dir))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    logger = create_logger(args.output_dir)
    watcher = FolderWatcher(
        args.input_dir, args.output_dir, args.settle_seconds, logger
    )
    logger.info("Watching %s; writing JSON files to %s", args.input_dir, args.output_dir)

    try:
        while True:
            watcher.scan_once()
            time.sleep(args.poll_interval)
    except KeyboardInterrupt:
        logger.info("Watcher stopped")


if __name__ == "__main__":
    main()
