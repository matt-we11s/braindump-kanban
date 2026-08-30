/**
 * Farm Brain Dump v.0 Kanban Sync
 *
 * In the Brain Dump v.0 spreadsheet:
 *   Extensions > Apps Script  -> paste this file, Save
 *   Deploy > Manage deployments > pencil > New version > Deploy
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Adds two columns if missing:
 *   M = Task ID
 *   N = Updated At
 */

function doGet(e) {
  try {
    e = e || { parameter: {} };
    if (e.parameter && e.parameter.debug === '1') {
      return json_(debugInfo_(), e);
    }
    if (e.parameter && e.parameter.payload) {
      return handleAction_(JSON.parse(e.parameter.payload), e);
    }
    return handleAction_({ action: e.parameter.action || 'get_all' }, e);
  } catch (err) {
    return json_({ error: String(err) }, e);
  }
}

function doPost(e) {
  try {
    var raw = '{}';
    if (e && e.postData && e.postData.contents) raw = e.postData.contents;
    else if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;
    return handleAction_(JSON.parse(raw), e);
  } catch (err) {
    return json_({ error: String(err) }, e);
  }
}

function handleAction_(postData, e) {
  var action = postData.action || 'get_all';
  var sheet = getSheet();
  ensureSchema(sheet);

  if (action === 'get_all') {
    return json_(listTasks(sheet), e);
  }

  if (action === 'update_status' || action === 'update_supplies' || action === 'update_task' || action === 'add_task') {
    var saved = upsertTask(sheet, postData.task || {});
    return json_({ status: 'success', task: saved }, e);
  }

  if (action === 'sync_all') {
    var results = [];
    (postData.tasks || []).forEach(function (t) {
      results.push(upsertTask(sheet, t));
    });
    return json_({ status: 'success', count: results.length, tasks: results }, e);
  }

  if (action === 'delete_task') {
    var data = readAll_(sheet);
    var rowIndex = findRowIndex(data, postData.task || {});
    if (rowIndex > 0) {
      sheet.deleteRow(rowIndex);
      return json_({ status: 'success', deleted: true }, e);
    }
    return json_({ status: 'success', deleted: false }, e);
  }

  return json_({ status: 'ignored', action: action }, e);
}

function debugInfo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function (sh) {
    var rec = { name: sh.getName(), maxCols: null, lastCol: null, lastRow: null, headers: null, err: null };
    try {
      rec.maxCols = sh.getMaxColumns();
      rec.lastCol = sh.getLastColumn();
      rec.lastRow = sh.getLastRow();
      var width = Math.max(1, Math.min(rec.lastCol || 1, rec.maxCols));
      rec.headers = sh.getRange(1, 1, 1, width).getValues()[0];
    } catch (err) {
      rec.err = String(err);
    }
    return rec;
  });
  var picked = null;
  try { picked = getSheet().getName(); } catch (err) { picked = String(err); }
  return { spreadsheet: ss.getName(), picked: picked, sheets: sheets };
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script is not bound to the Brain Dump spreadsheet.');
  var sheets = ss.getSheets();
  var scored = [];

  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    try {
      var maxCols = sh.getMaxColumns();
      var lastCol = sh.getLastColumn();
      var lastRow = sh.getLastRow();
      if (maxCols < 2 || lastRow < 1) continue;
      var width = Math.max(1, Math.min(lastCol || 1, maxCols));
      var headers = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
        return String(h || '').toLowerCase();
      });
      var joined = headers.join(' | ');
      var score = 0;
      if (/summary/.test(joined)) score += 6;
      if (/status/.test(joined)) score += 6;
      if (/raw|note/.test(joined)) score += 4;
      if (/supplies/.test(joined)) score += 5;
      if (/timestamp/.test(joined)) score += 2;
      if (/priority/.test(joined)) score += 2;
      if (/next/.test(joined)) score += 2;
      var name = sh.getName().toLowerCase();
      if (name.indexOf('kanban') !== -1 && score < 12) score -= 8;
      if (name.indexOf('dashboard') !== -1 && score < 12) score -= 8;
      if (score > 0) scored.push({ sh: sh, score: score });
    } catch (err) {
      // skip chart / filter / dashboard tabs that do not support ranges
    }
  }

  scored.sort(function (a, b) { return b.score - a.score; });
  if (scored.length) return scored[0].sh;

  for (var j = 0; j < sheets.length; j++) {
    try {
      sheets[j].getRange(1, 1).getValue();
      return sheets[j];
    } catch (err) {}
  }
  throw new Error('No usable data sheet found in ' + ss.getName());
}

function ensureColumns(sheet, n) {
  var max = sheet.getMaxColumns();
  if (max < n) sheet.insertColumnsAfter(max, n - max);
}

function ensureSchema(sheet) {
  ensureColumns(sheet, 14);
  var headers = sheet.getRange(1, 1, 1, 14).getValues()[0];
  if (!String(headers[12] || '').trim()) sheet.getRange(1, 13).setValue('Task ID');
  if (!String(headers[13] || '').trim()) sheet.getRange(1, 14).setValue('Updated At');
}

function readAll_(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  ensureColumns(sheet, 14);
  return sheet.getRange(1, 1, lastRow, 14).getValues();
}

function listTasks(sheet) {
  var data = readAll_(sheet);
  var tz = Session.getScriptTimeZone();
  var tasks = [];
  var idWrites = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1] && !row[2]) continue;
    var id = String(row[12] || '').trim();
    if (!id) {
      id = 'task_' + Utilities.getUuid();
      idWrites.push({ row: i + 1, id: id });
    }
    var ts = row[0]
      ? Utilities.formatDate(new Date(row[0]), tz, 'yyyy-MM-dd')
      : Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var updatedRaw = row[13];
    var updated = updatedRaw ? new Date(updatedRaw).getTime() : Date.now();
    tasks.push({
      id: id,
      row_index: i + 1,
      timestamp: ts,
      raw_note: String(row[1] || ''),
      summary: String(row[2] || row[1] || ''),
      scope: String(row[3] || 'Small Task'),
      category: String(row[4] || 'Improvement'),
      subject: String(row[5] || 'Garden'),
      complexity: String(row[6] || 'Medium'),
      effort: String(row[7] || '1-2 hours'),
      priority: String(row[8] || 'Medium'),
      status: String(row[9] || 'Not Started'),
      next_step: String(row[10] || ''),
      supplies_on_hand: String(row[11] || 'N').toUpperCase() === 'Y' ? 'Y' : 'N',
      updated_at: isNaN(updated) ? Date.now() : updated
    });
  }

  idWrites.forEach(function (w) {
    sheet.getRange(w.row, 13).setValue(w.id);
  });
  return tasks;
}

function findRowIndex(data, task) {
  if (!task) return -1;
  var searchId = String(task.id || '').trim();
  if (searchId) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][12] || '').trim() === searchId) return i + 1;
    }
  }
  var searchSummary = String(task.summary || '').trim().toLowerCase();
  var searchRaw = String(task.raw_note || '').trim().toLowerCase();
  for (var j = 1; j < data.length; j++) {
    var rowRaw = String(data[j][1] || '').trim().toLowerCase();
    var rowSummary = String(data[j][2] || '').trim().toLowerCase();
    if (searchSummary && (rowSummary === searchSummary || rowRaw === searchSummary)) return j + 1;
    if (searchRaw && (rowRaw === searchRaw || rowSummary === searchRaw)) return j + 1;
  }
  return -1;
}

function upsertTask(sheet, t) {
  ensureSchema(sheet);
  var data = readAll_(sheet);
  var tz = Session.getScriptTimeZone();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var id = String(t.id || '').trim() || ('task_' + Utilities.getUuid());
  var updated = Number(t.updated_at) || Date.now();
  var row = [
    t.timestamp || today,
    t.raw_note || t.summary || '',
    t.summary || t.raw_note || '',
    t.scope || 'Small Task',
    t.category || 'Improvement',
    t.subject || 'Garden',
    t.complexity || 'Medium',
    t.effort || '1-2 hours',
    t.priority || 'Medium',
    t.status || 'Not Started',
    t.next_step || '',
    t.supplies_on_hand || 'N',
    id,
    new Date(updated)
  ];
  var rowIndex = findRowIndex(data, Object.assign({}, t, { id: id }));
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 14).setValues([row]);
  } else {
    sheet.appendRow(row);
    rowIndex = sheet.getLastRow();
  }
  t.id = id;
  t.row_index = rowIndex;
  t.updated_at = updated;
  return t;
}

function json_(obj, e) {
  var out = JSON.stringify(obj);
  if (e && e.parameter && e.parameter.callback) {
    return ContentService
      .createTextOutput(e.parameter.callback + '(' + out + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}
