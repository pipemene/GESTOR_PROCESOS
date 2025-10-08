// v3.3 Navigation & session
const sections=["view-login","view-ordenes","view-usuarios","view-reportes","view-config"];const nav=document.getElementById('navMenu');const sidebar=document.getElementById('sidebar');
function show(id){sections.forEach(s=>document.getElementById(s)?.classList.add('hide'));document.getElementById(id)?.classList.remove('hide');document.getElementById('topTitle').textContent=({"view-login":"Iniciar sesión","view-ordenes":"Órdenes","view-usuarios":"Usuarios","view-reportes":"Reportes","view-config":"Configuración"}[id]||'Panel');}
let session=null;
function buildMenu(){
  nav.innerHTML='';
  const btn=(txt,view)=>{const a=document.createElement('a');a.className='nav-btn';a.textContent=txt;a.href='javascript:void(0)';a.onclick=()=>show(view);nav.appendChild(a);};
  if(!session) return;
  btn('🧾 Órdenes','view-ordenes');
  if(session.rol==='admin'||session.rol==='superadmin'){ btn('📈 Reportes','view-reportes'); btn('⚙️ Configuración','view-config'); }
  if(session.rol==='superadmin'){ btn('👥 Usuarios','view-usuarios'); }
  const out=document.createElement('a');out.className='nav-btn';out.textContent='🚪 Cerrar sesión';out.onclick=()=>{session=null;document.getElementById('sessionInfo').textContent='Sin sesión';sidebar.classList.add('hide');show('view-login');};nav.appendChild(out);
}
document.getElementById('btnPing').addEventListener('click',async()=>{const el=document.getElementById('loginStatus');try{const r=await fetch('/api/test');const j=await r.json();el.textContent=j.ok?('Conexión OK. GAS_URL '+(j.env.GAS_URL_present?'presente':'faltante')):'Fallo test';el.className='status '+(j.ok?'ok':'err')}catch(e){el.textContent=e.message;el.className='status err'}});
document.getElementById('btnLogin').addEventListener('click',async()=>{const usuario=document.getElementById('lUsuario').value.trim();const clave=document.getElementById('lClave').value;const el=document.getElementById('loginStatus');try{const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario,clave})});const d=await res.json();if(!res.ok||d.status!=='ok')throw new Error(d.message||'Error login');session=d.data;document.getElementById('sessionInfo').textContent=session.usuario+' · '+session.rol;el.textContent='Sesión iniciada';el.className='status ok';sidebar.classList.remove('hide');buildMenu();show('view-ordenes');guardByRole();}catch(e){el.textContent=e.message;el.className='status err'}});
function guardByRole(){const canCreate=session&&(session.rol==='admin'||session.rol==='superadmin');const b=document.getElementById('btnNueva');if(b) b.disabled=!canCreate;}
show('view-login');