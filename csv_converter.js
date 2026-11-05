(function (root, factory) {
  const csvConverter = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = csvConverter;
  } else {
    root.CsvConverter = csvConverter;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseCsv(text) {
    if (typeof text !== 'string') {
      throw new TypeError('CSV content must be text.');
    }

    const source = text.replace(/^\uFEFF/, '');
    const records = [];
    let record = [];
    let field = '';
    let insideQuotes = false;
    let afterQuote = false;

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];

      if (insideQuotes) {
        if (character === '"') {
          if (source[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            insideQuotes = false;
            afterQuote = true;
          }
        } else {
          field += character;
        }
        continue;
      }

      if (afterQuote) {
        if (character === ',') {
          record.push(field);
          field = '';
          afterQuote = false;
        } else if (character === '\n' || character === '\r') {
          record.push(field);
          records.push(record);
          record = [];
          field = '';
          afterQuote = false;
          if (character === '\r' && source[index + 1] === '\n') {
            index += 1;
          }
        } else if (character !== ' ' && character !== '\t') {
          throw new Error('Unexpected character after a quoted CSV field.');
        }
        continue;
      }

      if (character === '"') {
        if (field.length !== 0) {
          throw new Error('Unexpected quote in an unquoted CSV field.');
        }
        insideQuotes = true;
      } else if (character === ',') {
        record.push(field);
        field = '';
      } else if (character === '\n' || character === '\r') {
        record.push(field);
        records.push(record);
        record = [];
        field = '';
        if (character === '\r' && source[index + 1] === '\n') {
          index += 1;
        }
      } else {
        field += character;
      }
    }

    if (insideQuotes) {
      throw new Error('CSV contains an unclosed quoted field.');
    }
    if (field.length !== 0 || record.length !== 0) {
      record.push(field);
      records.push(record);
    }

    while (records.length && records[records.length - 1].length === 1 &&
      records[records.length - 1][0] === '') {
      records.pop();
    }
    if (records.length === 0) {
      throw new Error('CSV is empty or has no header row.');
    }

    const headers = records.shift().map(function (header) {
      return header.trim();
    });
    if (headers.some(function (header) { return header.length === 0; })) {
      throw new Error('Every column must have a header.');
    }
    if (new Set(headers).size !== headers.length) {
      throw new Error('Column headers must be unique.');
    }

    const rows = [];
    records.forEach(function (values, recordIndex) {
      if (values.length === 1 && values[0] === '') {
        return;
      }
      if (values.length > headers.length) {
        throw new Error('Row ' + (recordIndex + 2) + ' has more values than the header.');
      }
      while (values.length < headers.length) {
        values.push('');
      }
      rows.push(Object.fromEntries(headers.map(function (header, index) {
        return [header, values[index]];
      })));
    });

    return { headers: headers, rows: rows };
  }

  function convertCsvText(text) {
    const result = parseCsv(text);
    return JSON.stringify(result.rows, null, 2);
  }

  function setupConverterPage() {
    const form = document.getElementById('csv-upload-form');
    if (!form) {
      return;
    }

    const fileInput = document.getElementById('csv-file');
    const status = document.getElementById('csv-status');
    const resultSection = document.getElementById('csv-result');
    const preview = document.getElementById('json-preview');
    const summary = document.getElementById('csv-summary');
    const downloadButton = document.getElementById('download-json');
    let downloadUrl = null;
    let jsonOutput = '';
    let outputName = 'converted.json';

    function clearResult() {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        downloadUrl = null;
      }
      jsonOutput = '';
      resultSection.hidden = true;
      downloadButton.disabled = true;
      preview.textContent = '';
      summary.textContent = '';
    }

    fileInput.addEventListener('change', function () {
      clearResult();
      status.textContent = '';
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearResult();

      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        status.textContent = 'اختر ملف CSV أولاً.';
        return;
      }
      if (!/\.csv$/i.test(file.name)) {
        status.textContent = 'يرجى اختيار ملف بامتداد CSV.';
        return;
      }

      status.textContent = 'جارٍ تحويل الملف في متصفحك...';
      let text;
      try {
        const bytes = await file.arrayBuffer();
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch (error) {
        status.textContent = 'تعذر قراءة الملف. تأكد من أن ترميزه UTF-8.';
        return;
      }

      try {
        const result = parseCsv(text);
        jsonOutput = JSON.stringify(result.rows, null, 2);
        const visibleRows = result.rows.slice(0, 20);
        preview.textContent = JSON.stringify(visibleRows, null, 2);
        summary.textContent = 'تم تحويل ' + result.rows.length + ' صفاً و' +
          result.headers.length + ' أعمدة.' +
          (result.rows.length > visibleRows.length
            ? ' المعاينة تعرض أول 20 صفاً فقط.'
            : '');
        outputName = file.name.replace(/\.csv$/i, '') + '.json';
        resultSection.hidden = false;
        downloadButton.disabled = false;
        status.textContent = 'اكتمل التحويل. لم يتم رفع الملف إلى أي خادم.';
      } catch (error) {
        status.textContent = error.message || 'تعذر تحويل ملف CSV.';
      }
    });

    downloadButton.addEventListener('click', function () {
      if (!jsonOutput) {
        return;
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      downloadUrl = URL.createObjectURL(new Blob(
        [jsonOutput + '\n'],
        { type: 'application/json;charset=utf-8' }
      ));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = outputName;
      link.click();
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', setupConverterPage);
  }

  return {
    parseCsv: parseCsv,
    convertCsvText: convertCsvText
  };
}));
