// v3.1 Orders – autosign + responsive
const tabla=document.getElementById("tablaOrdenes"), tbody=tabla.querySelector("tbody"), info=document.getElementById("listInfo");
const filtroEstado=document.getElementById("filtroEstado"), filtroTexto=document.getElementById("filtroTexto");

document.getElementById("btnCargar").addEventListener("click",cargarOrdenes);
filtroEstado.addEventListener("change",cargarOrdenes);
filtroTexto.addEventListener("input",()=>{ if(tbody.children.length) filtrarRows(); });

async function cargarOrdenes(){
  tbody.innerHTML="";
  try{
    if(!session) throw new Error("Inicia sesión primero");
    const res = await fetch("/api/listOrders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:session.usuario,rol:session.rol})});
    const j = await res.json(); if(!res.ok||j.status!=="ok") throw new Error(j.message||"Error listOrders");
    const rows = j.data||[];
    if(!rows.length){ info.textContent="Sin órdenes"; info.className="status muted"; tabla.classList.add("hide"); return; }
    rows.forEach(r=>{
      const tr=document.createElement("tr"); tr.dataset.row=JSON.stringify(r);
      tr.innerHTML = `<td>${r.radicado||""}</td><td>${r.fecha||""}</td><td>${r.inquilino||""}</td><td>${r.telefono||""}</td><td>${r.codigo||""}</td><td>${r.descripcion||""}</td><td>${r.tecnico||""}</td><td>${badgeEstado(r.estado)}</td><td></td>`;
      tr.lastChild.appendChild(buildAcciones(r)); tbody.appendChild(tr);
    });
    filtrarRows();
    info.textContent = rows.length+" registros"; info.className="status muted"; tabla.classList.remove("hide");
  }catch(e){ info.textContent=e.message; info.className="status err"; tabla.classList.add("hide"); }
}
function badgeEstado(est){ const s=String(est||"").toLowerCase(); if(s==="finalizado") return `<span class='badge fin'>Finalizado</span>`; if(s==="en curso") return `<span class='badge en'>En curso</span>`; return `<span class='badge pend'>Pendiente</span>`; }
function filtrarRows(){
  const est=filtroEstado.value.toLowerCase(), q=filtroTexto.value.toLowerCase();
  [...tbody.children].forEach(tr=>{
    const r=JSON.parse(tr.dataset.row||"{}"); const passEst=!est || String(r.estado||"").toLowerCase()===est;
    const t = `${r.radicado} ${r.inquilino} ${r.telefono} ${r.codigo} ${r.descripcion} ${r.tecnico}`.toLowerCase();
    const passTxt = !q || t.includes(q);
    tr.style.display = (passEst && passTxt)? "" : "none";
  });
}
function buildAcciones(row){
  const box=document.createElement("div"); box.style.display="flex"; box.style.gap="6px"; box.style.flexWrap="wrap";
  const isUnassigned = !row.tecnico || String(row.tecnico).trim()==="" || String(row.tecnico).toLowerCase()==="sin asignar";

  // Botón Trabajo (tecnico asignado, admin/superadmin o sin asignar)
  const canWork = session && (session.rol==="admin"||session.rol==="superadmin"|| isUnassigned || String(row.tecnico||"").toLowerCase()===session.usuario.toLowerCase());
  if(canWork){ const btnWork=document.createElement("button"); btnWork.textContent="🛠️ Trabajo"; btnWork.onclick=()=> openWork(row); box.appendChild(btnWork); }

  // Tomar orden (si sin asignar y es técnico)
  if(session && session.rol==="tecnico" && isUnassigned){ const btnTake=document.createElement("button"); btnTake.textContent="Tomar"; btnTake.className="btn-green"; btnTake.onclick=async()=>{ if(!confirm("¿Asignarte esta orden?")) return; await assignOrder(row.radicado, session.usuario); await cargarOrdenes(); }; box.appendChild(btnTake); }

  // Editar (admin/superadmin)
  const canEdit = session && (session.rol==="admin"||session.rol==="superadmin");
  if(canEdit){ const btnE=document.createElement("button"); btnE.textContent="Editar"; btnE.onclick=()=> openModal("edit", row); box.appendChild(btnE); }

  // Eliminar (solo superadmin)
  const canDelete = session && session.rol==="superadmin";
  if(canDelete){ const btnD=document.createElement("button"); btnD.textContent="Eliminar"; btnD.className="btn-red"; btnD.onclick=async()=>{ if(!confirm("¿Eliminar esta orden?")) return; await deleteOrder(row.radicado); await cargarOrdenes(); }; box.appendChild(btnD); }

  return box;
}

// ----- Crear / Editar (código inmutable en edición) -----
const modalBack=document.getElementById("modalBack"), modalTitle=document.getElementById("modalTitle");
const mInquilino=document.getElementById("mInquilino"), mTelefono=document.getElementById("mTelefono"), mCodigo=document.getElementById("mCodigo"), mDescripcion=document.getElementById("mDescripcion"), mTecnico=document.getElementById("mTecnico"), mEstado=document.getElementById("mEstado");
const mGuardar=document.getElementById("mGuardar"), mCancelar=document.getElementById("mCancelar"), modalStatus=document.getElementById("modalStatus");
document.getElementById("btnNueva").addEventListener("click",()=>openModal("new"));
let modalMode="new", editingRadicado=null;
function openModal(mode,row=null){
  modalMode=mode; modalStatus.textContent="";
  if(mode==="new"){ modalTitle.textContent="Nueva orden"; mInquilino.value=""; mTelefono.value=""; mCodigo.value=""; mDescripcion.value=""; mTecnico.value=""; mEstado.value="Pendiente"; mCodigo.removeAttribute("readonly"); }
  else{ modalTitle.textContent="Editar orden "+(row?.radicado||""); editingRadicado=row.radicado; mInquilino.value=row.inquilino||""; mTelefono.value=row.telefono||""; mCodigo.value=row.codigo||""; mDescripcion.value=row.descripcion||""; mTecnico.value=row.tecnico||""; mEstado.value=row.estado||"Pendiente"; mCodigo.setAttribute("readonly","true"); }
  modalBack.classList.add("show");
}
mCancelar.addEventListener("click",()=>modalBack.classList.remove("show"));
mGuardar.addEventListener("click", async()=>{
  modalStatus.textContent="";
  try{
    if(!session) throw new Error("Inicia sesión");
    const base={ usuario:session.usuario, inquilino:mInquilino.value.trim(), telefono:mTelefono.value.trim(), descripcion:mDescripcion.value.trim(), tecnico:(mTecnico.value.trim()||"Sin asignar"), estado:mEstado.value };
    if(modalMode==="new"){ if(!(session.rol==="admin"||session.rol==="superadmin")) throw new Error("No puedes crear"); const res=await fetch("/api/createOrder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...base, codigo:mCodigo.value.trim()})}); const j=await res.json(); if(!res.ok||j.status!=="ok") throw new Error(j.message||"Error al crear"); }
    else{ if(!(session.rol==="admin"||session.rol==="superadmin")) throw new Error("No puedes editar"); const res=await fetch("/api/updateOrder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({radicado:editingRadicado, data:base})}); const j=await res.json(); if(!res.ok||j.status!=="ok") throw new Error(j.message||"Error al actualizar"); }
    modalBack.classList.remove("show"); await cargarOrdenes();
  }catch(e){ modalStatus.textContent=e.message; modalStatus.className="status err"; }
});

async function assignOrder(radicado, tecnico){ const r=await fetch("/api/assignOrder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({radicado, tecnico})}); const j=await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al asignar"); }
async function deleteOrder(radicado){ const r=await fetch("/api/deleteOrder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({radicado})}); const j=await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al eliminar"); }

// ----- Trabajo técnico -----
const workBack=document.getElementById("workBack"), wObs=document.getElementById("wObs"), wFiles=document.getElementById("wFiles"), dropZone=document.getElementById("dropZone"), thumbs=document.getElementById("thumbs"), wEstado=document.getElementById("wEstado");
const wGuardar=document.getElementById("wGuardar"), wCancelar=document.getElementById("wCancelar"), workStatus=document.getElementById("workStatus"), wAuto=document.getElementById("wAuto"), autoAsignHint=document.getElementById("autoAsignHint");
let workRadicado=null, workImages=[];
function openWork(row){
  workRadicado=row.radicado; wObs.value=""; wEstado.value = (row.estado||"Pendiente"); thumbs.innerHTML=""; workImages=[]; workBack.classList.add("show");
  const isUnassigned = !row.tecnico || String(row.tecnico).trim()==="" || String(row.tecnico).toLowerCase()==="sin asignar";
  if(isUnassigned && session.rol==="tecnico"){ wAuto.style.display="inline-block"; autoAsignHint.textContent = "Esta orden no tiene técnico. Puedes autoasignártela."; }
  else { wAuto.style.display="none"; autoAsignHint.textContent=""; }
}
wCancelar.addEventListener("click",()=>workBack.classList.remove("show"));

wAuto.addEventListener("click", async ()=>{
  try{ await assignOrder(workRadicado, session.usuario); wAuto.style.display="none"; autoAsignHint.textContent = "Asignada a ti."; }
  catch(e){ workStatus.textContent=e.message; workStatus.className="status err"; }
});

dropZone.addEventListener("click",()=>wFiles.click());
dropZone.addEventListener("dragover",e=>{e.preventDefault(); dropZone.style.borderColor="#3aa0ff";});
dropZone.addEventListener("dragleave",()=>{dropZone.style.borderColor="#2a4365";});
dropZone.addEventListener("drop",e=>{e.preventDefault(); wFiles.files = e.dataTransfer.files; handleFiles(); dropZone.style.borderColor="#2a4365";});
wFiles.addEventListener("change", handleFiles);

function handleFiles(){ thumbs.innerHTML=""; workImages=[]; const files=[...wFiles.files]; files.forEach(f=>{ const fr=new FileReader(); fr.onload=()=>{ workImages.push(fr.result); const img=new Image(); img.src=fr.result; img.style.maxWidth="120px"; img.style.borderRadius="8px"; img.style.border="1px solid #1a2744"; thumbs.appendChild(img); }; fr.readAsDataURL(f); }); }

wGuardar.addEventListener("click", async ()=>{
  workStatus.textContent="";
  try{
    if(!session) throw new Error("Inicia sesión");
    const payload = { radicado: workRadicado, observaciones: wObs.value.trim(), evidencias: workImages, estado: wEstado.value, tecnico: session.usuario };
    const r = await fetch("/api/updateWork", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
    const j = await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al actualizar trabajo");
    if(wEstado.value==="Finalizado"){ workBack.classList.remove("show"); openSignature(workRadicado); } else { workBack.classList.remove("show"); await cargarOrdenes(); }
  }catch(e){ workStatus.textContent=e.message; workStatus.className="status err"; }
});

// ----- Firma -----
const signBack=document.getElementById("signBack"), signPad=document.getElementById("signPad"), sGuardar=document.getElementById("sGuardar"), sLimpiar=document.getElementById("sLimpiar"), sCancelar=document.getElementById("sCancelar"), signStatus=document.getElementById("signStatus");
let drawing=false, sx=0, sy=0, signRadicado=null, ctx=signPad.getContext("2d");
ctx.lineWidth=2; ctx.strokeStyle="#e8eefb"; ctx.lineCap="round";
function openSignature(r){ signRadicado=r; clearSign(); signBack.classList.add("show"); }
function clearSign(){ ctx.clearRect(0,0,signPad.width,signPad.height); }
sLimpiar.addEventListener("click", clearSign);
sCancelar.addEventListener("click", ()=> signBack.classList.remove("show"));

function pos(e){ const rect=signPad.getBoundingClientRect(); return {x:(e.touches?e.touches[0].clientX:e.clientX)-rect.left, y:(e.touches?e.touches[0].clientY:e.clientY)-rect.top}; }
function start(e){ e.preventDefault(); drawing=true; const p=pos(e); sx=p.x; sy=p.y; }
function draw(e){ if(!drawing) return; const p=pos(e); ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(p.x,p.y); ctx.stroke(); sx=p.x; sy=p.y; }
function end(){ drawing=false; }
signPad.addEventListener("mousedown",start); signPad.addEventListener("mousemove",draw); window.addEventListener("mouseup",end);
signPad.addEventListener("touchstart",start,{passive:false}); signPad.addEventListener("touchmove",draw,{passive:false}); signPad.addEventListener("touchend",end);

sGuardar.addEventListener("click", async ()=>{
  signStatus.textContent="";
  try{
    const dataURL = signPad.toDataURL("image/png");
    const r1 = await fetch("/api/saveSignature", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({radicado: signRadicado, firmaBase64: dataURL})});
    const j1 = await r1.json(); if(!r1.ok||j1.status!=="ok") throw new Error(j1.message||"Error guardando firma");
    const r2 = await fetch("/api/generatePDF", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({radicado: signRadicado})});
    const j2 = await r2.json(); if(!r2.ok||j2.status!=="ok") throw new Error(j2.message||"Error generando PDF");
    signBack.classList.remove("show"); await cargarOrdenes();
  }catch(e){ signStatus.textContent=e.message; signStatus.className="status err"; }
});
