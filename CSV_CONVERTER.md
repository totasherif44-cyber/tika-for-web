# CSV to JSON converter

Open `csv-converter.html` in a browser or host the project as a static website. Choose a UTF-8 CSV file, select **Convert to JSON**, review the preview, and download the resulting JSON file. The conversion runs locally in the browser; file contents are not sent to a server. CSV headers become JSON object keys, and quoted commas, escaped quotes, line breaks, Unicode, and UTF-8 BOMs are supported. Duplicate or blank headers and malformed rows are reported instead of silently discarded.

The page can be deployed with the existing static site; no backend, Python runtime, or third-party library is needed. The separate `csv_to_json_watcher.py` remains an optional command-line folder watcher and does not serve the website.

To run the browser-side parser checks, open `tests/csv_converter_tests.html` in a modern browser. The folder-watcher tests can be run with `python -m unittest discover -s tests -v`.
