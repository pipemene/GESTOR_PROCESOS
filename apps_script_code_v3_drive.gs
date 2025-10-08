/**
 * Blue Home v3 – Apps Script con Drive
 * Hoja 'Ordenes' debe contener columnas:
 * Radicado | Fecha | Inquilino | Telefono | Código | Descripcion | Tecnico | Estado | Observaciones | Evidencias (URLs) | Firma inquilino (URL) | PDF generado (URL) | Última actualización
 */
const SHEET_ID = '1VizQYx8-vDENf3_FkQ2fYAdpC993cpR5NmlcSUg2J6w'; // tu hoja
const USERS_SHEET = 'Usuarios';
const ORDERS_SHEET = 'Ordenes';
const DRIVE_FOLDER_ID = 'PON_AQUI_EL_ID_DE_TU_CARPETA_EN_DRIVE'; // crea "Reportes Blue Home" y pega el ID

function doPost(e){
  try{
    if(!e.postData || !e.postData.contents) return json({status:'error', message:'Body vacío'});
    const { action='', payload={} } = JSON.parse(e.postData.contents);
    const map = { login, createOrder, listOrders, assignOrder, updateOrder, deleteOrder, updateWork, saveSignature, generatePDF };
    if(!map[action]) return json({status:'error', message:'Acción no válida: '+action});
    const out = map[action](payload);
    return json({status:'ok', data: out});
  }catch(err){ return json({status:'error', message:String(err)}); }
}

function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet(n){ return ss().getSheetByName(n); }
function nowISO(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function nextRadicado(){ const ts=Utilities.formatDate(new Date(), Session.getScriptTimeZone(),'yyyyMMddHHmmss'); return 'ORD-'+ts; }
function ensureFolder(rootId, name){
  const root = DriveApp.getFolderById(rootId);
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function ensureOrderFolder(radicado){
  const parent = ensureFolder(DRIVE_FOLDER_ID, 'Reportes');
  return ensureFolder(parent.getId(), String(radicado));
}

/** LOGIN */
function login({usuario, clave}){
  if(!usuario || !clave) throw new Error('Faltan datos');
  const sh = sheet(USERS_SHEET); const v = sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ const [u,c,r] = v[i]; if(String(u).toLowerCase()===String(usuario).toLowerCase() && String(c)===String(clave)) return {usuario:u, rol:String(r||'').toLowerCase()}; }
  throw new Error('Usuario o clave incorrecta');
}

/** CREAR */
function createOrder({usuario, inquilino, telefono, codigo, descripcion, tecnico, estado}){
  if(!usuario || !descripcion) throw new Error('Datos incompletos');
  const sh = sheet(ORDERS_SHEET);
  const rad = nextRadicado(); const fecha = nowISO();
  if(sh.getLastRow()===0){
    sh.appendRow(['Radicado','Fecha','Inquilino','Telefono','Código','Descripcion','Tecnico','Estado','Observaciones','Evidencias (URLs)','Firma inquilino (URL)','PDF generado (URL)','Última actualización']);
  }
  sh.appendRow([rad, fecha, inquilino||'', telefono||'', codigo||'', descripcion||'', tecnico||'Sin asignar', estado||'Pendiente', '', '', '', '', '']);
  return { radicado: rad };
}

/** LISTAR */
function listOrders({usuario, rol}){
  const sh = sheet(ORDERS_SHEET); const values = sh.getDataRange().getValues(); const out=[];
  const isTec = String(rol||'').toLowerCase()==='tecnico';
  for(let i=1;i<values.length;i++){
    const [radicado, fecha, inquilino, telefono, codigo, descripcion, tecnico, estado] = values[i];
    if(isTec){
      const t=String(tecnico||'').toLowerCase(), u=String(usuario||'').toLowerCase();
      if(t!==u && t!=='sin asignar') continue;
    }
    out.push({ radicado, fecha, inquilino, telefono, codigo, descripcion, tecnico, estado });
  }
  out.sort((a,b)=> String(b.fecha).localeCompare(String(a.fecha)));
  return out;
}

/** ASIGNAR */
function assignOrder({radicado, tecnico}){
  if(!radicado || !tecnico) throw new Error('Faltan datos');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){ sh.getRange(i+1,7).setValue(tecnico); sh.getRange(i+1,13).setValue(nowISO()); return {radicado, tecnico}; }
  }
  throw new Error('Radicado no encontrado');
}

/** UPDATE básico (admin) */
function updateOrder({radicado, data}){
  if(!radicado || !data) throw new Error('Faltan datos');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){
      if(typeof data.inquilino!=='undefined') sh.getRange(i+1,3).setValue(data.inquilino);
      if(typeof data.telefono!=='undefined')  sh.getRange(i+1,4).setValue(data.telefono);
      if(typeof data.descripcion!=='undefined') sh.getRange(i+1,6).setValue(data.descripcion);
      if(typeof data.tecnico!=='undefined')    sh.getRange(i+1,7).setValue(data.tecnico||'Sin asignar');
      if(typeof data.estado!=='undefined')     sh.getRange(i+1,8).setValue(data.estado);
      sh.getRange(i+1,13).setValue(nowISO());
      return { radicado };
    }
  }
  throw new Error('Radicado no encontrado');
}

/** DELETE */
function deleteOrder({radicado}){
  if(!radicado) throw new Error('Falta radicado');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){ sh.deleteRow(i+1); return {radicado}; }
  }
  throw new Error('Radicado no encontrado');
}

/** UPDATE WORK (observaciones + evidencias + estado) */
function updateWork({radicado, observaciones, evidencias, estado, tecnico}){
  if(!radicado) throw new Error('Falta radicado');
  const sh = sheet(ORDERS_SHEET);
  const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  let rowIdx = -1;
  for(let i=1;i<rng.length;i++){ if(String(rng[i][0])===String(radicado)){ rowIdx=i+1; break; } }
  if(rowIdx<0) throw new Error('Radicado no encontrado');

  // Guardar observaciones
  if(typeof observaciones!=='undefined'){
    const prev = String(sh.getRange(rowIdx,9).getValue()||'');
    const merged = prev ? (prev + \"\\n\" + observaciones) : observaciones;
    sh.getRange(rowIdx,9).setValue(merged);
  }

  // Guardar evidencias (base64 dataURLs)
  if(evidencias && evidencias.length){
    const folder = ensureOrderFolder(radicado);
    const evFolder = ensureFolder(folder.getId(), 'evidencias');
    const urls = [];
    for(let i=0;i<evidencias.length;i++){
      const d = evidencias[i];
      const blob = dataUrlToBlob(d);
      blob.setName('evidencia_'+(i+1)+'.png');
      const f = evFolder.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push(f.getUrl());
    }
    const prevUrls = String(sh.getRange(rowIdx,10).getValue()||'');
    const finalUrls = prevUrls ? (prevUrls+\"\\n\"+urls.join(\"\\n\")) : urls.join(\"\\n\");
    sh.getRange(rowIdx,10).setValue(finalUrls);
  }

  // Estado
  if(typeof estado!=='undefined'){ sh.getRange(rowIdx,8).setValue(estado); }
  sh.getRange(rowIdx,13).setValue(nowISO());
  return { radicado };
}

function dataUrlToBlob(dataUrl){
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/data:(.*);base64/)[1] || 'application/octet-stream';
  const bytes = Utilities.base64Decode(parts[1]);
  return Utilities.newBlob(bytes, mime, 'upload');
}

/** Save signature (dataURL) */
function saveSignature({radicado, firmaBase64}){
  if(!radicado || !firmaBase64) throw new Error('Falta firma');
  const folder = ensureOrderFolder(radicado);
  const blob = dataUrlToBlob(firmaBase64).setName('firma.png');
  const f = folder.createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Actualizar URL firma (col 11)
  const sh = sheet(ORDERS_SHEET); const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  for(let i=1;i<rng.length;i++){
    if(String(rng[i][0])===String(radicado)){
      sh.getRange(i+1,11).setValue(f.getUrl());
      sh.getRange(i+1,13).setValue(nowISO());
      return { url: f.getUrl() };
    }
  }
  throw new Error('Radicado no encontrado');
}

/** Generate PDF (HTML -> PDF) */
function generatePDF({radicado}){
  const sh = sheet(ORDERS_SHEET); const last = sh.getLastRow(); const rng = sh.getRange(1,1,last,13).getValues();
  let row=null, idx=-1;
  for(let i=1;i<rng.length;i++){ if(String(rng[i][0])===String(radicado)){ row=rng[i]; idx=i+1; break; } }
  if(!row) throw new Error('Radicado no encontrado');
  const [R,Fecha,Inq,Tel,Cod,Desc,Tec,Est,Obs,EviUrls,FirmaUrl] = row;

  const folder = ensureOrderFolder(radicado);

  const html = `
    <html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif; font-size:12px}
      .title{font-size:18px;font-weight:bold;margin-bottom:8px}
      .box{border:1px solid #ddd; padding:10px; border-radius:8px; margin-bottom:10px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:6px}
      .thumb{width:160px;height:auto;margin:6px;border:1px solid #ccc}
      .muted{color:#555}
    </style></head><body>
      <div class="title">BLUE HOME INMOBILIARIA – REPORTE DE SERVICIO</div>
      <div class="box">
        <table>
          <tr><th>Radicado</th><td>${R}</td><th>Fecha</th><td>${Fecha}</td></tr>
          <tr><th>Inquilino</th><td>${Inq}</td><th>Teléfono</th><td>${Tel}</td></tr>
          <tr><th>Código</th><td>${Cod}</td><th>Técnico</th><td>${Tec}</td></tr>
          <tr><th>Estado</th><td colspan="3">${Est}</td></tr>
        </table>
      </div>
      <div class="box"><b>Descripción inicial</b><div>${sanitize(Desc)}</div></div>
      <div class="box"><b>Trabajo realizado / Observaciones</b><div>${sanitize(Obs).replace(/\\n/g,'<br>')}</div></div>
      <div class="box"><b>Evidencias</b><div>
        ${(String(EviUrls||'').split('\\n').filter(Boolean).map(u=>`<img class='thumb' src='${u}'>`).join(''))||'<span class="muted">Sin evidencias</span>'}
      </div></div>
      <div class="box"><b>Firma del inquilino</b><div>
        ${FirmaUrl?`<img src='${FirmaUrl}' style='max-width:260px;border:1px solid #ccc'>`:'<span class="muted">Sin firma</span>'}
      </div><p class="muted">El inquilino certifica que los trabajos fueron realizados a satisfacción.</p></div>
      <div class="muted">Generado: ${nowISO()}</div>
    </body></html>
  `;
  const blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf').setName(`${radicado}_reporte.pdf`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Guardar URL PDF (col 12) y estado Finalizado si no lo está
  sh.getRange(idx,12).setValue(file.getUrl());
  const curEst = String(sh.getRange(idx,8).getValue()||'');
  if(curEst.toLowerCase()!=='finalizado') sh.getRange(idx,8).setValue('Finalizado');
  sh.getRange(idx,13).setValue(nowISO());

  return { url: file.getUrl() };
}

function sanitize(s){ return String(s||'').replace(/[<>&]/g, m=>({\"<\":\"&lt;\",\">\":\"&gt;\",\"&\":\"&amp;\"}[m])); }
