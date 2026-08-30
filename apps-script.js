/**
 * Farm Brain Dump v.0 Kanban Sync
 *
 * In the Brain Dump v.0 spreadsheet:
 *   Extensions > Apps Script  -> paste this file, Save
 *   Deploy > Manage deployments > Edit (pencil) > New version > Deploy
 *   (Or Deploy > New deployment, type Web app, Execute as Me, Who has access: Anyone)
 *
 * Adds two columns if missing:
 *   M = Task ID (stable match, no more title-collision overwrites)
 *   N = Updated At
 */

function doGet(e) {
  try {
    const sheet = getSheet();
    ensureSchema(sheet);
    return json_(listTasks(sheet));
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const raw = (e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const postData = JSON.parse(raw);
    const action = postData.action;
    const sheet = getSheet();
    ensureSchema(sheet);

    if (action === 'get_all') {
      return json_(listTasks(sheet));
    }

    if (action === 'update_status' || action === 'update_supplies' || action === 'update_task' || action === 'add_task') {
      const saved = upsertTask(sheet, postData.task || {});
      return json_({ status: 'success', task: saved });
    }

    if (action === 'sync_all') {
      const results = [];
      (postData.tasks || []).forEach(function (t) {
        results.push(upsertTask(sheet, t));
      });
      return json_({ status: 'success', count: results.length, tasks: results });
    }

    if (action === 'delete_task') {
      const data = sheet.getDataRange().getValues();
      const rowIndex = findRowIndex(data, postData.task || {});
      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
        return json_({ status: 'success', deleted: true });
      }
      return json_({ status: 'success', deleted: false });
    }

    return json_({ status: 'ignored' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getActiveSheet() || ss.getSheets()[0];
}

function ensureSchema(sheet) {
  const headers = sheet.getRange(1, 1, 1, 14).getValues()[0];
  if (!String(headers[12] || '').trim()) sheet.getRange(1, 13).setValue('Task ID');
  if (!String(headers[13] || '').trim()) sheet.getRange(1, 14).setValue('Updated At');
}

function listTasks(sheet) {
  const data = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1] && !row[2]) continue;
    let id = String(row[12] || '').trim();
    if (!id) {
      id = 'task_' + Utilities.getUuid();
      sheet.getRange(i + 1, 13).setValue(id);
    }
    const ts = row[0]
      ? Utilities.formatDate(new Date(row[0]), tz, 'yyyy-MM-dd')
      : Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const updatedRaw = row[13];
    const updated = updatedRaw ? new Date(updatedRaw).getTime() : Date.now();
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
  return tasks;
}

function findRowIndex(data, task) {
  if (!task) return -1;
  const searchId = String(task.id || '').trim();
  if (searchId) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][12] || '').trim() === searchId) return i + 1;
    }
  }
  const searchSummary = String(task.summary || '').trim().toLowerCase();
  const searchRaw = String(task.raw_note || '').trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const rowRaw = String(data[i][1] || '').trim().toLowerCase();
    const rowSummary = String(data[i][2] || '').trim().toLowerCase();
    if (searchSummary && (rowSummary === searchSummary || rowRaw === searchSummary)) return i + 1;
    if (searchRaw && (rowRaw === searchRaw || rowSummary === searchRaw)) return i + 1;
  }
  return -1;
}

function upsertTask(sheet, t) {
  const data = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const id = String(t.id || '').trim() || ('task_' + Utilities.getUuid());
  const updated = Number(t.updated_at) || Date.now();
  const row = [
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
  let rowIndex = findRowIndex(data, Object.assign({}, t, { id: id }));
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

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
