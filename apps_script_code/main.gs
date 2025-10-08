/*****************************************************
 *  BLUE HOME INMOBILIARIA - GESTOR DE PROCESOS v3.3 FINAL
 *****************************************************/
const SHEET_ID = '1VizQYx8-vDENf3_FkQ2fYAdpC993cpR5NmlcSUg2J6w';
const ORDERS_SHEET='Ordenes', USERS_SHEET='Usuarios';
const DRIVE_FOLDER_ID = '1K54pXarc87swF9vkKn4Bvl0oos1mw6j8';

function doPost(e){
  try{
    const {action='', payload={}} = JSON.parse(e.postData.contents);
    const map = { login, listOrders, createOrder, updateOrder, deleteOrder, assignOrder, updateWork, saveSignature, generatePDF, listUsers, createUser, updateUser, deleteUser, listTechnicians };
    if(!map[action]) throw new Error('Acción no válida');
    return json({status:'ok', data: map[action](payload)});
  }catch(err){ return json({status:'error', message:String(err)}); }
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss(){ return SpreadsheetApp.openById(SHEET_ID); }
function sheet(n){ return ss().getSheetByName(n); }
function now(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function nextRad(){ const ts=Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss'); return 'ORD-'+ts; }
function ensureFolder(rootId, name){ const root=DriveApp.getFolderById(rootId); const it=root.getFoldersByName(name); return it.hasNext()?it.next():root.createFolder(name); }
function ensureOrderFolder(r){ const parent=ensureFolder(DRIVE_FOLDER_ID,'Reportes'); return ensureFolder(parent.getId(), String(r)); }
function dataUrlToBlob(dataUrl){ const parts=dataUrl.split(','); const mime=parts[0].match(/data:(.*);base64/)[1]||'application/octet-stream'; const bytes=Utilities.base64Decode(parts[1]); return Utilities.newBlob(bytes, mime, 'upload'); }

/** Login */
function login({usuario, clave}){
  const sh=sheet(USERS_SHEET); const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(String(v[i][0]).toLowerCase()===String(usuario).toLowerCase() && String(v[i][1])===String(clave)) return {usuario:v[i][0], rol:String(v[i][2]||'').toLowerCase()}; }
  throw new Error('Usuario o clave incorrectos');
}

/** Órdenes */
function createOrder({usuario, inquilino, telefono, codigo, descripcion, tecnico, estado}){
  const sh=sheet(ORDERS_SHEET);
  if(sh.getLastRow()===0){ sh.appendRow(['Radicado','Fecha','Inquilino','Telefono','Código','Descripcion','Tecnico','Estado','Observaciones','Evidencias (URLs)','Firma inquilino (URL)','PDF generado (URL)','Última actualización']); }
  const rad=nextRad(); sh.appendRow([rad, now(), inquilino||'', telefono||'', codigo||'', descripcion||'', tecnico||'Sin asignar', estado||'Pendiente', '', '', '', '', '']); return {radicado:rad};
}
function listOrders({usuario, rol}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues(); const out=[]; const isTec=String(rol||'').toLowerCase()==='tecnico';
  for(let i=1;i<v.length;i++){ const r=v[i]; if(isTec){ const t=String(r[6]||'').toLowerCase(), u=String(usuario||'').toLowerCase(); if(t!==u && t!=='sin asignar') continue; } out.push({radicado:r[0],fecha:r[1],inquilino:r[2],telefono:r[3],codigo:r[4],descripcion:r[5],tecnico:r[6],estado:r[7],pdfUrl:r[11]||''}); }
  out.sort((a,b)=> String(b.fecha).localeCompare(String(a.fecha))); return out;
}
function assignOrder({radicado, tecnico}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ sh.getRange(i+1,7).setValue(tecnico||'Sin asignar'); sh.getRange(i+1,13).setValue(now()); return {radicado, tecnico}; } }
  throw new Error('Radicado no encontrado');
}
function updateOrder({radicado, data}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ if(data.inquilino!=null) sh.getRange(i+1,3).setValue(data.inquilino); if(data.telefono!=null) sh.getRange(i+1,4).setValue(data.telefono); if(data.codigo!=null) sh.getRange(i+1,5).setValue(data.codigo); if(data.descripcion!=null) sh.getRange(i+1,6).setValue(data.descripcion); if(data.tecnico!=null) sh.getRange(i+1,7).setValue(data.tecnico||'Sin asignar'); if(data.estado!=null) sh.getRange(i+1,8).setValue(data.estado); sh.getRange(i+1,13).setValue(now()); return {radicado}; } }
  throw new Error('Radicado no encontrado');
}
function deleteOrder({radicado}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ sh.deleteRow(i+1); return {radicado}; } }
  throw new Error('Radicado no encontrado');
}
function updateWork({radicado, observaciones, evidencias, estado, tecnico}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues(); let idx=-1;
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ idx=i+1; break; } }
  if(idx<0) throw new Error('Radicado no encontrado');
  if(observaciones!=null){ const prev=String(sh.getRange(idx,9).getValue()||''); const merged=prev?prev+'\\n'+observaciones:observaciones; sh.getRange(idx,9).setValue(merged); }
  if(evidencias&&evidencias.length){ const folder=ensureOrderFolder(radicado); const ev=ensureFolder(folder.getId(),'evidencias'); const urls=[]; for(let i=0;i<evidencias.length;i++){ const f=ev.createFile(dataUrlToBlob(evidencias[i]).setName('evidencia_'+(i+1)+'.png')); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); urls.push(f.getUrl()); } const prevU=String(sh.getRange(idx,10).getValue()||''); const finalU=prevU?(prevU+'\\n'+urls.join('\\n')):urls.join('\\n'); sh.getRange(idx,10).setValue(finalU); }
  if(estado!=null && String(estado).toLowerCase()!=='finalizado'){ sh.getRange(idx,8).setValue(estado); }
  sh.getRange(idx,13).setValue(now()); return {radicado};
}
function saveSignature({radicado, firmaBase64}){
  const folder=ensureOrderFolder(radicado); const f=folder.createFile(dataUrlToBlob(firmaBase64).setName('firma.png')); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ sh.getRange(i+1,11).setValue(f.getUrl()); sh.getRange(i+1,13).setValue(now()); return {url:f.getUrl()}; } }
  throw new Error('Radicado no encontrado');
}
function sanitizeName(name){ return String(name||'').replace(/[\\\/:*?"<>|#%&{}$!\'`~]/g,'_').trim() || 'documento'; }
function generatePDF({radicado}){
  const sh=sheet(ORDERS_SHEET); const v=sh.getDataRange().getValues(); let row=null, idx=-1;
  for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(radicado)){ row=v[i]; idx=i+1; break; } }
  if(!row) throw new Error('Radicado no encontrado');
  const [R,Fecha,Inq,Tel,Cod,Desc,Tec,Est,Obs,EviUrls,FirmaUrl] = row;
  if(!FirmaUrl) throw new Error('Debe firmar el inquilino antes de generar el PDF.');

  const fotos = String(EviUrls||'').split('\\n').filter(Boolean);
  const template = HtmlService.createTemplateFromFile('pdfTemplate');
  template.data = { radicado:R, fecha:Fecha, inquilino:Inq, telefono:Tel, codigo:Cod, descripcion:Desc, tecnico:Tec, estado:Est, actividades:Obs, fotos:fotos, firmaUrl:FirmaUrl };
  const html = template.evaluate().getContent();
  const pdfBlob = Utilities.newBlob(html,'text/html','orden.html').getAs('application/pdf');

  // Nombre por CÓDIGO del inmueble (fallback radicado)
  const fileName = sanitizeName(Cod||R) + '.pdf';
  const folder = ensureOrderFolder(R);
  const file = folder.createFile(pdfBlob).setName(fileName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  sh.getRange(idx,12).setValue(file.getUrl());
  sh.getRange(idx,8).setValue('Finalizado');
  sh.getRange(idx,13).setValue(now());

  return { url:file.getUrl(), name:fileName };
}

/** Usuarios */
function listUsers(){ const sh=sheet(USERS_SHEET); const v=sh.getDataRange().getValues(); const out=[]; for(let i=1;i<v.length;i++){ if(!v[i][0]) continue; out.push({usuario:String(v[i][0]), rol:String(v[i][2]||'').toLowerCase()}); } return out; }
function createUser({usuario, clave, rol}){ const sh=sheet(USERS_SHEET); if(!usuario||!clave||!rol) throw new Error('Datos incompletos'); sh.appendRow([usuario, clave, String(rol).toLowerCase()]); return {usuario}; }
function updateUser({usuario, clave, rol}){ const sh=sheet(USERS_SHEET); const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(usuario)){ if(rol) sh.getRange(i+1,3).setValue(String(rol).toLowerCase()); if(clave) sh.getRange(i+1,2).setValue(clave); return {usuario}; } } throw new Error('Usuario no encontrado'); }
function deleteUser({usuario}){ const sh=sheet(USERS_SHEET); const v=sh.getDataRange().getValues(); for(let i=1;i<v.length;i++){ if(String(v[i][0])===String(usuario)){ sh.deleteRow(i+1); return {usuario}; } } throw new Error('Usuario no encontrado'); }
function listTechnicians(){ return listUsers().filter(u=>u.rol==='tecnico'); }

/** Inicializador raíz opcional */
function inicializarUsuariosBase(){ const sh=sheet(USERS_SHEET)||ss().insertSheet('Usuarios'); if(sh.getLastRow()===0) sh.getRange('A1:C1').setValues([['Usuario','Clave','Rol']]); const v=sh.getDataRange().getValues(); const exists=v.some(r=>(r[0]||'').toString().toLowerCase()==='pipemene'); if(!exists) sh.appendRow(['PIPEMENE','Blu3h0m32016#','superadmin']); }
