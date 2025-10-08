function firmaPad(canvas){
  const ctx = canvas.getContext('2d'); let dib = false, prev=null;
  ctx.lineWidth=2; ctx.strokeStyle='#22c55e'; ctx.lineCap='round';
  const pos = e =>{ const r=canvas.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left,y:t.clientY-r.top}; };
  const st = e=>{ dib=true; prev=pos(e); e.preventDefault(); };
  const mv = e=>{ if(!dib)return; const p=pos(e); ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(p.x,p.y); ctx.stroke(); prev=p; e.preventDefault(); };
  const en = ()=>{ dib=false; };
  canvas.addEventListener('mousedown',st); canvas.addEventListener('mousemove',mv); window.addEventListener('mouseup',en);
  canvas.addEventListener('touchstart',st,{passive:false}); canvas.addEventListener('touchmove',mv,{passive:false}); window.addEventListener('touchend',en);
  return { clear: ()=>ctx.clearRect(0,0,canvas.width,canvas.height), toDataURL: ()=>canvas.toDataURL('image/png') };
}

document.addEventListener('DOMContentLoaded', ()=>{
  const badge = document.getElementById('userBadge'); if(badge) badge.textContent = localStorage.getItem('usuario') || '—';
  const cuerpo = document.querySelector('#tabla tbody'); const btnCargar = document.getElementById('btnCargar');
  const firmaCard = document.getElementById('firmaCard'); const radicadoSel = document.getElementById('radicadoSel');
  const canvas = document.getElementById('pad'); const pad = canvas? firmaPad(canvas) : null;
  const btnLimpiar = document.getElementById('btnLimpiar'); const btnGuardar = document.getElementById('btnGuardar'); const btnCancelar = document.getElementById('btnCancelar');
  let radicadoActual = null;

  async function cargar(){
    try{
      const r = await fetch('/api/getOrders'); const data = await r.json();
      const items = (data.registros || data.items || []);
      cuerpo.innerHTML=''; if(!items.length){ cuerpo.innerHTML='<tr><td colspan="7">Sin registros</td></tr>'; return; }
      for(const o of items){
        const id = o.Radicado || o.radicado || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${id}</td><td>${o.Fecha||''}</td><td>${o.Inquilino||''}</td><td>${o.Descripcion||''}</td><td>${o.Tecnico||''}</td><td>${o.Estado||''}</td>
          <td><button class="btn-success" data-fin="${id}">Finalizar</button></td>`;
        cuerpo.appendChild(tr);
      }
    }catch(e){ alert('Error cargando órdenes'); console.error(e); }
  }
  if(btnCargar) btnCargar.addEventListener('click', cargar);

  if(cuerpo){
    cuerpo.addEventListener('click', ev=>{
      const id = ev.target?.getAttribute?.('data-fin'); if(!id) return;
      radicadoActual = id; radicadoSel.textContent = id; firmaCard.style.display='block'; if(pad) pad.clear();
      window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
    });
  }

  if(btnLimpiar) btnLimpiar.addEventListener('click', ()=> pad && pad.clear());
  if(btnCancelar) btnCancelar.addEventListener('click', ()=> { firmaCard.style.display='none'; });

  if(btnGuardar){
    btnGuardar.addEventListener('click', async ()=>{
      if(!pad) return; try{
        const dataURL = pad.toDataURL();
        const r = await fetch('/api/saveSignature', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ radicado: radicadoActual, firma: dataURL }) });
        const resp = await r.json();
        if(resp.ok){ alert('Cierre registrado. PDF: ' + (resp.urlPDF || '')); firmaCard.style.display='none'; cargar(); }
        else{ alert('No se pudo guardar: ' + (resp.msg || 'error')); }
      }catch(e){ alert('Error de red'); console.error(e); }
    });
  }
});