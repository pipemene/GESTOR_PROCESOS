const $ = sel => document.querySelector(sel);
const log = (obj)=>{ const p = $('#log'); p.textContent = (typeof obj==='string'?obj:JSON.stringify(obj,null,2)) + "\n" + p.textContent; };

async function ping(){
  const r = await fetch('/api/test');
  const j = await r.json();
  log(j);
  alert('Conexión:\n'+JSON.stringify(j, null, 2));
}

async function login(){
  const usuario = $('#usuario').value.trim();
  const clave = $('#clave').value.trim();
  const r = await fetch('/api/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({usuario, clave})
  });
  const j = await r.json();
  log(j);
  if(j.ok){
    sessionStorage.setItem('usuario', usuario);
    sessionStorage.setItem('rol', j.rol);
    location.href = '/ordenes.html';
  }else{
    alert(j.msg || 'Usuario o clave incorrectos');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnPing').addEventListener('click', ping);
  $('#btnLogin').addEventListener('click', login);
});