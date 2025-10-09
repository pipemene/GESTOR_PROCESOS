// Code.gs — Configuración, Bootstrap y Utilidades
const SPREADSHEET_ID = 'PON_AQUI_TU_SPREADSHEET_ID';
const DRIVE_FOLDER_ID = 'PON_AQUI_TU_DRIVE_FOLDER_ID';
const SESSION_TTL_MINUTES = 480; // 8 horas

const SHEETS = {
  USERS: 'USERS',
  TECHS: 'TECHS',
  ORDERS: 'ORDERS',
  FILES: 'FILES'
};

const BRAND = {
  company: 'BLUE HOME INMOBILIARIA',
  address: 'Calle 31 #22-07, Palmira – Valle',
  phone: '602 280 6940',
  email: 'info@bluehomeinmo.co',
  web: 'www.bluehomeinmobiliaria.com'
};

function getDb() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const db = getDb();
  let sh = db.getSheetByName(name);
  if (!sh) sh = db.insertSheet(name);
  return sh;
}

function getDriveFolder() {
  return DriveApp.getFolderById(DRIVE_FOLDER_ID);
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
  const users = getSheet(SHEETS.USERS);
  headersIfEmpty_(users, ['email','name','role','hash','createdAt']);
  const techs = getSheet(SHEETS.TECHS);
  headersIfEmpty_(techs, ['techId','name','phone','active']);
  const orders = getSheet(SHEETS.ORDERS);
  headersIfEmpty_(orders, [
    'orderId','createdAt','status','clientName','clientId','clientPhone','propertyAddress',
    'issue','priority','assignedTechId','scheduledAt','finishedAt','signatureFileId','pdfFileId','notes'
  ]);
  const files = getSheet(SHEETS.FILES);
  headersIfEmpty_(files, ['fileId','orderId','type','name','url','createdAt']);

  // Usuario admin por defecto si no existe
  const data = users.getDataRange().getValues();
  if (data.length <= 1) {
    const hash = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'BlueHome2025*'));
    users.appendRow(['admin@bluehomeinmo.co','Administrador','admin',hash,new Date()]);
  }

  // Técnico de ejemplo
  const tdata = techs.getDataRange().getValues();
  if (tdata.length <= 1) {
    techs.appendRow(['T-001','Dayan','3163121416',true]);
    techs.appendRow(['T-002','Mauricio','3178574053',true]);
  }
  return 'OK bootstrap';
}

function doGet(e) {
  const page = (e && e.parameter && e.parameter.p) || 'login';
  const user = getCurrentUserFromSession_();
  if (!user && page !== 'login') {
    return HtmlService.createTemplateFromFile('Html/index')
      .evaluate().setTitle('Blue Home – Ingresar');
  }

  const map = {
    'login': 'Html/index',
    'dashboard': 'Html/dashboard',
    'new': 'Html/order_new',
    'detail': 'Html/order_detail'
  };
  const file = map[page] || 'Html/index';
  const tmpl = HtmlService.createTemplateFromFile(file);
  tmpl.BRAND = BRAND;
  tmpl.USER = user || null;
  return tmpl.evaluate()
    .setTitle('Blue Home – Reparaciones')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Utilidad para generar IDs
function uid(prefix) {
  const s = Utilities.getUuid().split('-')[0].toUpperCase();
  return (prefix || 'ID') + '-' + s;
}
