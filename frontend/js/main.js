document.addEventListener('DOMContentLoaded', ()=>{
  const btnLogin = document.getElementById('btnLogin');
  const btnTest = document.getElementById('btnTest');

  if(btnLogin){
    btnLogin.addEventListener('click', async ()=>{
      const usuario = document.getElementById('usuario').value.trim();
      const clave = document.getElementById('clave').value.trim();
      if(!usuario || !clave){ alert('Completa los campos'); return; }
      try{
        const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ usuario, clave }) });
        const data = await r.json();
        if(data.ok || data.success){ localStorage.setItem('usuario', usuario); window.location.href = '/ordenes'; }
        else{ alert(data.msg || 'Usuario o clave incorrectos'); }
      }catch(e){ alert('Error de red'); console.error(e); }
    });
  }

  if(btnTest){
    btnTest.addEventListener('click', async ()=>{
      const r = await fetch('/api/test'); const d = await r.json();
      alert('Conexión: ' + JSON.stringify(d, null, 2));
    });
  }
});