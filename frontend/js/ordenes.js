// Ordenes logic
const tabla = document.getElementById("tablaOrdenes");
const tbody = tabla.querySelector("tbody");
const info = document.getElementById("listInfo");
const filtroEstado = document.getElementById("filtroEstado");

document.getElementById("btnCargar").addEventListener("click", cargarOrdenes);
filtroEstado.addEventListener("change", cargarOrdenes);

async function cargarOrdenes(){
  tbody.innerHTML = "";
  try{
    if(!session) throw new Error("Inicia sesión primero");
    const res = await fetch("/api/listOrders", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({usuario: session.usuario, rol: session.rol})});
    const j = await res.json();
    if(!res.ok || j.status!=="ok") throw new Error(j.message||"Error listOrders");
    let rows = j.data || [];
    const est = filtroEstado.value;
    if(est) rows = rows.filter(r => String(r.estado||"")===est);
    if(!rows.length){ info.textContent="Sin órdenes"; info.className="status muted"; tabla.classList.add("hide"); return; }
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.radicado||""}</td><td>${r.fecha||""}</td><td>${r.inquilino||""}</td><td>${r.telefono||""}</td><td>${r.codigo||""}</td><td>${r.descripcion||""}</td><td>${r.tecnico||""}</td><td>${r.estado||""}</td><td></td>`;
      tr.lastChild.appendChild(buildAcciones(r));
      tbody.appendChild(tr);
    });
    info.textContent = rows.length+" registros"; info.className="status muted"; tabla.classList.remove("hide");
  }catch(e){ info.textContent=e.message; info.className="status err"; tabla.classList.add("hide"); }
}

function buildAcciones(row){
  const box = document.createElement("div"); box.style.display="flex"; box.style.gap="6px"; box.style.flexWrap="wrap";
  const isUnassigned = !row.tecnico || String(row.tecnico).trim()==="" || String(row.tecnico).toLowerCase()==="sin asignar";
  if(session && session.rol==="tecnico" && isUnassigned){
    const btnTake = document.createElement("button"); btnTake.textContent = "Tomar orden"; btnTake.className="btn-green";
    btnTake.onclick = async ()=>{ if(!confirm("¿Quieres asignarte esta orden?")) return; await assignOrder(row.radicado, session.usuario); await cargarOrdenes(); };
    box.appendChild(btnTake);
  }
  const canEdit = session && (session.rol==="admin" || session.rol==="superadmin");
  if(canEdit){
    const btnEdit = document.createElement("button"); btnEdit.textContent="Editar"; btnEdit.onclick = ()=> openModal("edit", row);
    box.appendChild(btnEdit);
  }
  const canDelete = session && session.rol==="superadmin";
  if(canDelete){
    const btnDel = document.createElement("button"); btnDel.textContent="Eliminar"; btnDel.className="btn-red";
    btnDel.onclick = async ()=>{ if(!confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) return; await deleteOrder(row.radicado); await cargarOrdenes(); };
    box.appendChild(btnDel);
  }
  return box;
}

// Modal
const modalBack = document.getElementById("modalBack");
const modalTitle = document.getElementById("modalTitle");
const mInquilino = document.getElementById("mInquilino");
const mTelefono  = document.getElementById("mTelefono");
const mCodigo    = document.getElementById("mCodigo");
const mDescripcion = document.getElementById("mDescripcion");
const mTecnico   = document.getElementById("mTecnico");
const mEstado    = document.getElementById("mEstado");
const mGuardar   = document.getElementById("mGuardar");
const mCancelar  = document.getElementById("mCancelar");
const modalStatus= document.getElementById("modalStatus");

let modalMode = "new";
let editingRadicado = null;

document.getElementById("btnNueva").addEventListener("click", ()=> openModal("new"));

function openModal(mode, row=null){
  modalMode = mode; modalStatus.textContent="";
  if(mode==="new"){
    modalTitle.textContent = "Nueva orden";
    mInquilino.value=""; mTelefono.value=""; mCodigo.value=""; mDescripcion.value=""; mTecnico.value=""; mEstado.value="Pendiente";
    mCodigo.removeAttribute("readonly");
  }else{
    modalTitle.textContent = "Editar orden "+(row?.radicado||"");
    editingRadicado = row.radicado;
    mInquilino.value = row.inquilino||""; mTelefono.value=row.telefono||""; mCodigo.value=row.codigo||""; mDescripcion.value=row.descripcion||""; mTecnico.value=row.tecnico||""; mEstado.value=row.estado||"Pendiente";
    mCodigo.setAttribute("readonly","true"); // Código INTACTO en edición
  }
  modalBack.classList.add("show");
}
mCancelar.addEventListener("click", ()=> modalBack.classList.remove("show"));

mGuardar.addEventListener("click", async ()=>{
  modalStatus.textContent="";
  try{
    if(!session) throw new Error("Inicia sesión primero");
    const base = {
      usuario: session.usuario,
      inquilino: mInquilino.value.trim(),
      telefono:  mTelefono.value.trim(),
      descripcion: mDescripcion.value.trim(),
      tecnico: (mTecnico.value.trim()||"Sin asignar"),
      estado: mEstado.value
    };
    if(modalMode==="new"){
      if(!(session.rol==="admin"||session.rol==="superadmin")) throw new Error("No puedes crear");
      const payload = { ...base, codigo: mCodigo.value.trim() };
      const r = await fetch("/api/createOrder", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)});
      const j = await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al crear");
    }else{
      if(!(session.rol==="admin"||session.rol==="superadmin")) throw new Error("No puedes editar");
      // ATENCIÓN: no enviamos 'codigo' en update para mantenerlo inmutable
      const r = await fetch("/api/updateOrder", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ radicado: editingRadicado, data: base })});
      const j = await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al actualizar");
    }
    modalBack.classList.remove("show"); await cargarOrdenes();
  }catch(e){ modalStatus.textContent=e.message; modalStatus.className="status err"; }
});

async function assignOrder(radicado, tecnico){
  const r = await fetch("/api/assignOrder", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ radicado, tecnico })});
  const j = await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al asignar");
}
async function deleteOrder(radicado){
  const r = await fetch("/api/deleteOrder", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ radicado })});
  const j = await r.json(); if(!r.ok||j.status!=="ok") throw new Error(j.message||"Error al eliminar");
}
