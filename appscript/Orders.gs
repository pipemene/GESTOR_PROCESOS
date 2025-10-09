// Orders.gs — CRUD de órdenes sobre hoja ORDENES
function listOrdersLight() {
  const sh = getSheet_('ORDENES');
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i=1;i<values.length;i++){
    const v = values[i];
    out.push({
      createdAt: v[0], inquilino:v[1], telefono:v[2], codigo:v[3],
      descripcion:v[4], tecnico:v[5], estado:v[6]
    });
  }
  return out;
}

function createOrder(order) {
  const sh = getSheet_('ORDENES');
  const row = [
    new Date(), order.inquilino||'', order.telefono||'', order.codigo||'',
    order.descripcion||'', order.tecnico||'', order.estado||'creada',
    order.observaciones||'', '', '' // fotos, firma
  ];
  sh.appendRow(row);
  return { ok:true };
}
