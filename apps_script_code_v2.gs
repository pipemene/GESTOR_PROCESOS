/** Blue Home v2 – Apps Script */
const SHEET_ID = '1VizQYx8-vDENf3_FkQ2fYAdpC993cpR5NmlcSUg2J6w';
const USERS_SHEET = 'Usuarios';
const ORDERS_SHEET = 'Ordenes';

function doPost(e){
  try{
    if(!e.postData || !e.postData.contents) return json({status:'error', message:'Body vacío'});
    const { action='', payload={} } = JSON.parse(e.postData.contents);
    const map = { login, createOrder, listOrders, assignOrder, updateOrder, deleteOrder };
    if(!map[action]) return json({status:'error', message:'Acción no válida: '+action});
    const out = map[action](payload);
    return json({status:'ok', data: out});
  }catch(err){ return json({status:'error', message: String(err)}); }
}
function json(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function ss(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet(n){ return ss().getSheetByName(n); }
function nowISO(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function nextRadicado(){ const ts=Utilities.formatDate(new Date(), Session.getScriptTimeZone(),'yyyyMMddHHmmss'); return 'ORD-'+ts; }

function login({usuario, clave}){
  if(!usuario || !clave) throw new Error('Faltan datos');
  const sh = sheet(USERS_SHEET);
  const v = sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){
    const [u,c,r]=v[i];
    if(String(u).toLowerCase()===String(usuario).toLowerCase() && String(c)===String(clave)){
      return { usuario:u, rol: String(r||'').toLowerCase() };
    }
  }
  throw new Error('Usuario o clave incorrecta');
}

function createOrder({usuario, inquilino, telefono, codigo, descripcion, tecnico, estado}){
  if(!usuario || !descripcion) throw new Error('Datos incompletos');
  const sh = sheet(ORDERS_SHEET);
  const rad = nextRadicado();
  const fecha = nowISO();
  const row = [rad,fecha, inquilino||'', telefono||'', codigo||'', descripcion||'', tecnico||'Sin asignar', estado||'Pendiente', '', '', '' ];
  if(sh.getLastRow()===0){
    sh.appendRow(['Radicado','Fecha','Inquilino','Telefono','Código','Descripcion','Tecnico','Estado','Observaciones','Fotos','Firma']);
  }
  sh.appendRow(row);
  return { radicado: rad };
}

function listOrders({usuario, rol}){
  const sh = sheet(ORDERS_SHEET);
  const values = sh.getDataRange().getValues();
  const out=[]; const isTec = String(rol||'').toLowerCase()==='tecnico';
  for(let i=1;i<values.length;i++){
    const [radicado,fecha, inquilino, telefono, codigo, descripcion, tecnico, estado] = values[i];
    if(isTec){
      const t = String(tecnico||'').toLowerCase(); const u = String(usuario||'').toLowerCase();
      if(t!==u && t!=='sin asignar') continue;
    }
    out.push({radicado, fecha, inquilino, telefono, codigo, descripcion, tecnico, estado});
  }
  out.sort((a,b)=> String(b.fecha).localeCompare(String(a.fecha)));
  return out;
}

function assignOrder({radicado, tecnico}){
  if(!radicado || !tecnico) throw new Error('Faltan datos');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow();
  const data = sh.getRange(1,1,last,11).getValues();
  for(let i=1;i<data.length;i++){
    if(String(data[i][0])===String(radicado)){
      sh.getRange(i+1,7).setValue(tecnico);
      return { radicado, tecnico };
    }
  }
  throw new Error('Radicado no encontrado');
}

function updateOrder({radicado, data}){
  if(!radicado || !data) throw new Error('Faltan datos');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow();
  const rng = sh.getRange(1,1,last,11).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){
      if(typeof data.inquilino!=='undefined') sh.getRange(i+1,3).setValue(data.inquilino);
      if(typeof data.telefono!=='undefined')  sh.getRange(i+1,4).setValue(data.telefono);
      // NOTA: NO tocamos Código (col 5) para mantenerlo intacto
      if(typeof data.descripcion!=='undefined') sh.getRange(i+1,6).setValue(data.descripcion);
      if(typeof data.tecnico!=='undefined')    sh.getRange(i+1,7).setValue(data.tecnico||'Sin asignar');
      if(typeof data.estado!=='undefined')     sh.getRange(i+1,8).setValue(data.estado);
      return { radicado };
    }
  }
  throw new Error('Radicado no encontrado');
}

function deleteOrder({radicado}){
  if(!radicado) throw new Error('Falta radicado');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow();
  const rng = sh.getRange(1,1,last,11).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){
      sh.deleteRow(i+1);
      return { radicado };
    }
  }
  throw new Error('Radicado no encontrado');
}
