/**
 * Apps Script para conectar con Google Sheets.
 * Hoja: 'Usuarios' (Usuario | Clave | Rol)
 * Hoja: 'Ordenes'  (Radicado | Fecha | Inquilino | Telefono | Código | Descripcion | Tecnico | Estado | Observaciones | Fotos | Firma)
 */

const SHEET_ID = 'PON_AQUI_EL_ID_DE_TU_SPREADSHEET';
const USERS_SHEET = 'Usuarios';
const ORDERS_SHEET = 'Ordenes';

function doPost(e){
  try{
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action;
    const payload = data.payload || {};
    const out = ({
      login,
      createOrder,
      listOrders
    }[action] || (()=>{throw new Error('Acción no soportada')}))(payload);
    return json({status:'ok', data: out});
  }catch(err){
    return json({status:'error', message: String(err)});
  }
}

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet(n){ return ss().getSheetByName(n); }
function nowISO(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }

function nextRadicado(){
  const d = new Date();
  const ts = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  return 'ORD-' + ts;
}

function login({usuario, clave}){
  if(!usuario || !clave) throw new Error('Faltan datos');
  const sh = sheet(USERS_SHEET);
  const values = sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    const [u,c,r] = values[i];
    if(String(u).toLowerCase() === String(usuario).toLowerCase() && String(c) === String(clave)){
      return { usuario: u, rol: String(r||'').toLowerCase() };
    }
  }
  throw new Error('Usuario o clave incorrecta');
}

function createOrder({usuario, inquilino, telefono, codigo, descripcion, tecnico, prioridad, estado}){
  if(!usuario || !descripcion) throw new Error('Datos incompletos');
  const sh = sheet(ORDERS_SHEET);
  const rad = nextRadicado();
  const fecha = nowISO();
  const row = [rad, fecha, inquilino||'', telefono||'', codigo||'', descripcion||'', tecnico||'', estado||'Pendiente', '', '', ''];
  // Asegurar cabeceras si la hoja está vacía
  if(sh.getLastRow()===0){
    sh.appendRow(['Radicado','Fecha','Inquilino','Telefono','Código','Descripcion','Tecnico','Estado','Observaciones','Fotos','Firma']);
  }
  sh.appendRow(row);
  return { radicado: rad };
}

function listOrders({usuario, rol}){
  const sh = sheet(ORDERS_SHEET);
  const values = sh.getDataRange().getValues();
  const out = [];
  const isTecnico = String(rol||'').toLowerCase()==='tecnico';
  for(let i=1;i<values.length;i++){
    const [radicado,fecha, inquilino, telefono, codigo, descripcion, tecnico, estado, obs, fotos, firma] = values[i];
    if(isTecnico){
      if(String(tecnico||'').toLowerCase() !== String(usuario||'').toLowerCase()) continue;
    }
    out.push({radicado, fecha, inquilino, telefono, codigo, descripcion, tecnico, estado});
  }
  return out;
}
