/**
 * Apps Script para conectar Frontend HTML con Google Sheets.
 * Hojas sugeridas en el Spreadsheet:
 *  - USERS: [timestamp, name, email, pass_hash]
 *  - RADICADOS: [timestamp, radicado, email, asunto, detalle, cliente, prioridad, estado]
 *
 * Configuración:
 *  1) Crea un Spreadsheet y copia su ID aquí en SHEET_ID.
 *  2) Publica este script como Web App: Implementar -> Nueva implementación -> Tipo: App web ->
 *     Acceso: Cualquiera con el enlace -> Copia la URL y pégala en el frontend.
 */

const SHEET_ID = 'PON_AQUI_EL_ID_DE_TU_SPREADSHEET';
const USERS_SHEET = 'USERS';
const RAD_SHEET = 'RADICADOS';

function doPost(e){
  try{
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action;
    const payload = data.payload || {};
    const handler = {
      registerUser,
      login,
      createRadicado,
      listRadicados
    }[action];
    if(!handler) return json({status:'error', message:'Acción no soportada'}, 400);
    const result = handler(payload);
    return json({status:'ok', data: result});
  }catch(err){
    return json({status:'error', message: String(err)}, 500);
  }
}

function json(obj, code){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Utilidades **/
function ss(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet(name){ return ss().getSheetByName(name) || ss().insertSheet(name); }
function nowISO(){ return new Date().toISOString(); }

function sha256(str){
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  const hex = raw.map(b => (('0'+(b & 0xFF).toString(16)).slice(-2))).join('');
  return hex;
}

function nextRadicado(){
  // BH-YYYYMMDD-HHMMSS-XXXX
  const d = new Date();
  const ts = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const rand = Math.floor(Math.random()*10000).toString().padStart(4,'0');
  return `BH-${ts}-${rand}`;
}

/** Acciones **/
function registerUser({name,email,pass}){
  if(!name || !email || !pass) throw new Error('Datos incompletos');
  const sh = sheet(USERS_SHEET);
  const values = sh.getDataRange().getValues();
  const emailLc = String(email).trim().toLowerCase();
  // evitar duplicados
  for(let i=0;i<values.length;i++){
    if((values[i][2]||'').toString().toLowerCase() === emailLc){
      throw new Error('El correo ya existe');
    }
  }
  const passHash = sha256(pass);
  sh.appendRow([nowISO(), name, emailLc, passHash]);
  return { email: emailLc };
}

function login({email,pass}){
  if(!email || !pass) throw new Error('Credenciales incompletas');
  const emailLc = String(email).trim().toLowerCase();
  const sh = sheet(USERS_SHEET);
  const values = sh.getDataRange().getValues();
  const passHash = sha256(pass);
  for(let i=0;i<values.length;i++){
    const row = values[i];
    if((row[2]||'').toString().toLowerCase() === emailLc){
      if((row[3]||'').toString() === passHash){
        return { email: emailLc };
      } else {
        throw new Error('Contraseña incorrecta');
      }
    }
  }
  throw new Error('Usuario no encontrado');
}

function createRadicado({email, asunto, detalle, cliente, prioridad}){
  if(!email || !asunto) throw new Error('Datos del radicado incompletos');
  const sh = sheet(RAD_SHEET);
  const radicado = nextRadicado();
  const estado = 'Abierto';
  sh.appendRow([nowISO(), radicado, email, asunto || '', detalle || '', cliente || '', prioridad || '', estado]);
  return { radicado };
}

function listRadicados({email}){
  if(!email) throw new Error('Falta email');
  const sh = sheet(RAD_SHEET);
  const values = sh.getDataRange().getValues();
  const out = [];
  for(let i=1;i<values.length;i++){ // asumiendo fila 1 puede ser cabecera
    const [ts, rad, em, asu, det, cli, pri, est] = values[i];
    if(String(em).toLowerCase() === String(email).toLowerCase()){
      out.push({
        fecha: ts,
        radicado: rad,
        asunto: asu,
        cliente: cli,
        prioridad: pri,
        estado: est
      });
    }
  }
  // orden más reciente primero
  out.sort((a,b) => (a.fecha < b.fecha ? 1 : -1));
  return out;
}
