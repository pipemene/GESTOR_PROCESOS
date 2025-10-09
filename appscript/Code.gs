// Code.gs — Configuración, Bootstrap y Utilidades
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Cargar configuración desde Railway (evita hardcodear IDs en código)
function getConfig_() {
  const url = "https://gestorprocesos-production.up.railway.app/api/config";
  const res = UrlFetchApp.fetch(url);
  return JSON.parse(res.getContentText());
}

function getDb_() {
  const cfg = getConfig_();
  return SpreadsheetApp.openById(cfg.spreadsheet.id);
}

function getDriveFolder_() {
  const cfg = getConfig_();
  return DriveApp.getFolderById(cfg.drive.id);
}

function getSheet_(name) {
  const db = getDb_();
  let sh = db.getSheetByName(name);
  if (!sh) sh = db.insertSheet(name);
  return sh;
}

function headersIfEmpty_(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  } else {
    const first = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    if (first.join('') === '') sh.getRange(1,1,1,headers.length).setValues([headers]);
  }
}

function bootstrap() {
  const users = getSheet_('USUARIOS'); // respetando tu hoja real
  headersIfEmpty_(users, ['Usuario','Clave','Rol']);

  const ordenes = getSheet_('ORDENES');
  headersIfEmpty_(ordenes, ['Fecha','Inquilino','Teléfono','Código','Descripción','Técnico','Estado','Observaciones','Fotos','Firma']);

  return 'OK bootstrap';
}

function doGet(e) {
  const page = (e && e.parameter && e.parameter.p) || 'login';
  const map = {
    'login': 'Html/index',
    'dashboard': 'Html/dashboard',
    'new': 'Html/order_new',
    'detail': 'Html/order_detail'
  };
  const file = map[page] || 'Html/index';
  const tmpl = HtmlService.createTemplateFromFile(file);
  tmpl.BRAND = {
    company: 'BLUE HOME INMOBILIARIA',
    address: 'Calle 31 #22-07, Palmira – Valle',
    phone: '602 280 6940',
    email: 'info@bluehomeinmo.co',
    web: 'www.bluehomeinmobiliaria.com'
  };
  return tmpl.evaluate()
    .setTitle('Blue Home – Reparaciones')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
