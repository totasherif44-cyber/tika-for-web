import io
import json
import logging
import tempfile
import unittest
from pathlib import Path

from csv_to_json_watcher import FolderWatcher, convert_csv_file


class ConvertCsvFileTests(unittest.TestCase):
    def test_converts_headers_and_preserves_unicode(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "people.csv"
            output_dir = root / "output"
            source.write_text(
                'name,city\n"Ada Lovelace","München & 東京"\n',
                encoding="utf-8",
            )

            output_path = convert_csv_file(source, output_dir)

            self.assertEqual(
                json.loads(output_path.read_text(encoding="utf-8")),
                [{"name": "Ada Lovelace", "city": "München & 東京"}],
            )
            self.assertIn("München & 東京", output_path.read_text(encoding="utf-8"))

    def test_supports_utf8_bom_and_rejects_empty_file(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "bom.csv"
            source.write_text("\ufeffid,value\n1,hello\n", encoding="utf-8")
            convert_csv_file(source, root / "output")
            self.assertEqual(
                json.loads((root / "output" / "bom.json").read_text(encoding="utf-8")),
                [{"id": "1", "value": "hello"}],
            )

            empty_source = root / "empty.csv"
            empty_source.write_text("", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "no header row"):
                convert_csv_file(empty_source, root / "output")


class FolderWatcherTests(unittest.TestCase):
    def test_waits_until_stable_and_does_not_convert_repeatedly(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            input_dir = root / "input"
            output_dir = root / "output"
            input_dir.mkdir()
            source = input_dir / "new.csv"
            source.write_text("id\n1\n", encoding="utf-8")
            log_output = io.StringIO()
            logger = logging.getLogger("watcher-test-success")
            logger.setLevel(logging.INFO)
            logger.propagate = False
            handler = logging.StreamHandler(log_output)
            logger.addHandler(handler)
            watcher = FolderWatcher(
                input_dir, output_dir, settle_seconds=2, logger=logger
            )

            watcher.scan_once(now=10)
            self.assertFalse((output_dir / "new.json").exists())
            watcher.scan_once(now=11)
            self.assertFalse((output_dir / "new.json").exists())
            watcher.scan_once(now=12)
            output_path = output_dir / "new.json"
            self.assertTrue(output_path.exists())
            self.assertIn("Converted", log_output.getvalue())
            output_mtime = output_path.stat().st_mtime_ns

            watcher.scan_once(now=20)
            self.assertEqual(output_path.stat().st_mtime_ns, output_mtime)
            logger.removeHandler(handler)
            handler.close()

    def test_restarts_stability_wait_when_file_changes(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            input_dir = root / "input"
            output_dir = root / "output"
            input_dir.mkdir()
            source = input_dir / "changing.csv"
            source.write_text("id\n1\n", encoding="utf-8")
            watcher = FolderWatcher(
                input_dir, output_dir, settle_seconds=2, logger=logging.getLogger("test")
            )

            watcher.scan_once(now=0)
            source.write_text("id\n22\n", encoding="utf-8")
            watcher.scan_once(now=2)
            self.assertFalse((output_dir / "changing.json").exists())
            watcher.scan_once(now=4)
            self.assertEqual(
                json.loads(
                    (output_dir / "changing.json").read_text(encoding="utf-8")
                ),
                [{"id": "22"}],
            )


if __name__ == "__main__":
    unittest.main()
