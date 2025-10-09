const $ = s=>document.querySelector(s);
const log = obj=>{$('#log').textContent = (typeof obj==='string'?obj:JSON.stringify(obj,null,2));};

async function cargar(){
  const r = await fetch('/api/ordenes');
  const j = await r.json();
  log(j);
  if(!j.ok) return alert(j.msg||'Error');
  const rows = j.registros || [];
  const keys = rows.length? Object.keys(rows[0]) : [];
  let html = '<div style="overflow:auto"><table class="tbl"><thead><tr>'+keys.map(k=>`<th>${k}</th>`).join('')+'</tr></thead><tbody>';
  for(const row of rows){
    html += '<tr>'+keys.map(k=>`<td>${row[k]??''}</td>`).join('')+'</tr>';
  }
  html += '</tbody></table></div>';
  $('#tabla').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('#who').textContent = (sessionStorage.getItem('usuario')||'') + ' · ' + (sessionStorage.getItem('rol')||'');
  $('#btnLoad').addEventListener('click', cargar);
  $('#btnSalir').addEventListener('click', ()=>{ sessionStorage.clear(); location.href='/' });
});