import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\n/g, '\n'),
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const USERS_SHEET = process.env.USERS_SHEET || 'Usuarios';
const ORDERS_SHEET = process.env.ORDERS_SHEET || 'ordenes';

/* USERS */
export async function getUsers() {
  const range = `${USERS_SHEET}!A2:C`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = res.data.values || [];
  return rows.filter(r => r.join('').trim()!=='').map(r => ({ usuario:r[0]||'', clave:r[1]||'', rol:r[2]||'' }));
}

export async function createUser({ usuario, clave, rol }) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:C`, valueInputOption:'RAW',
    requestBody:{ values:[[usuario, clave, rol]] }
  });
  return { ok:true, message:'✅ Usuario creado' };
}

export async function updateUser(usuario, { clave, rol }) {
  const base = `${USERS_SHEET}!A2:C`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: base });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => (r[0]||'').toLowerCase().trim() === String(usuario).toLowerCase().trim());
  if (idx===-1) return { ok:false, message:'Usuario no encontrado' };
  const row = rows[idx];
  if (clave!=null && clave!=='') row[1] = clave;
  if (rol!=null && rol!=='') row[2] = rol;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A${idx+2}:C${idx+2}`, valueInputOption:'RAW',
    requestBody:{ values:[row] }
  });
  return { ok:true, message:'✅ Usuario actualizado' };
}

export async function deleteUser(usuario) {
  const base = `${USERS_SHEET}!A2:C`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: base });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => (r[0]||'').toLowerCase().trim() === String(usuario).toLowerCase().trim());
  if (idx===-1) return { ok:false, message:'Usuario no encontrado' };
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A${idx+2}:C${idx+2}`, valueInputOption:'RAW',
    requestBody:{ values:[['','','']] }
  });
  return { ok:true, message:'🗑️ Usuario eliminado' };
}

/* ORDERS */
function mapOrder(r=[]) {
  return { cliente:r[0]||'', fecha:r[1]||'', inquilino:r[2]||'', telefono:r[3]||'', codigo:r[4]||'', descripcion:r[5]||'', tecnico:r[6]||'', estado:r[7]||'', observaciones:r[8]||'' };
}

export async function listOrders(rol='superadmin', usuario='') {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${ORDERS_SHEET}!A2:I` });
  const rows = res.data.values || [];
  let f;
  if (['superadmin','admin'].includes(String(rol).toLowerCase())) f = rows;
  else f = rows.filter(r => (r[6]||'').toLowerCase().trim() === String(usuario).toLowerCase().trim());
  return (f||[]).map(mapOrder);
}

export async function createOrder(d={}) {
  const fecha = new Date().toLocaleString('es-CO');
  const newRow = [ d.cliente||'', fecha, d.inquilino||'', d.telefono||'', d.codigo||'', d.descripcion||'', d.tecnico||'Sin asignar', d.estado||'Pendiente', d.observaciones||'' ];
  await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range:`${ORDERS_SHEET}!A:I`, valueInputOption:'RAW', requestBody:{ values:[newRow] } });
  return { ok:true, message:'✅ Orden creada' };
}

export async function assignTech(codigo, tecnico) {
  if(!codigo||!tecnico) return { ok:false, message:'Código y técnico requeridos' };
  const base = `${ORDERS_SHEET}!A2:I`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: base });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[4] === codigo);
  if (idx===-1) return { ok:false, message:'Orden no encontrada' };
  rows[idx][6] = tecnico;
  rows[idx][7] = 'En proceso';
  await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range:`${ORDERS_SHEET}!A${idx+2}:I${idx+2}`, valueInputOption:'RAW', requestBody:{ values:[rows[idx]] } });
  return { ok:true, message:`✅ Orden ${codigo} asignada a ${tecnico}` };
}

export async function getSummary() {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${ORDERS_SHEET}!A2:I` });
  const rows = res.data.values || [];
  const acc = {}; rows.forEach(r => { const e = r[7] || 'Pendiente'; acc[e] = (acc[e]||0)+1; });
  return acc;
}
