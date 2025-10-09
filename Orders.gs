// Orders.gs — CRUD, archivos y PDF
function listTechs() {
  const sh = getSheet(SHEETS.TECHS);
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i=1;i<values.length;i++){
    const [techId,name,phone,active] = values[i];
    if (active === true || active === 'TRUE' || active === 'true') {
      out.push({techId,name,phone});
    }
  }
  return out;
}

function createOrder(order) {
  const sh = getSheet(SHEETS.ORDERS);
  const id = uid('ORD');
  const now = new Date();
  const row = [
    id, now, 'creada', order.clientName || '', order.clientId || '', order.clientPhone || '',
    order.propertyAddress || '', order.issue || '', order.priority || 'media', order.assignedTechId || '',
    order.scheduledAt || '', '', '', '', order.notes || ''
  ];
  sh.appendRow(row);
  return { ok:true, orderId:id };
}

function getOrder(orderId) {
  const sh = getSheet(SHEETS.ORDERS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++){
    if (values[i][0] === orderId) {
      const v = values[i];
      return { 
        ok:true, 
        order: {
          orderId: v[0], createdAt: v[1], status: v[2], clientName: v[3], clientId: v[4], clientPhone: v[5],
          propertyAddress: v[6], issue: v[7], priority: v[8], assignedTechId: v[9], scheduledAt: v[10], finishedAt: v[11],
          signatureFileId: v[12], pdfFileId: v[13], notes: v[14]
        }
      };
    }
  }
  return { ok:false, message:'No existe' };
}

function updateOrder(order) {
  const sh = getSheet(SHEETS.ORDERS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++){
    if (values[i][0] === order.orderId) {
      const v = values[i];
      // Actualiza solo campos claves si vienen
      v[2] = order.status || v[2];
      v[3] = order.clientName || v[3];
      v[4] = order.clientId || v[4];
      v[5] = order.clientPhone || v[5];
      v[6] = order.propertyAddress || v[6];
      v[7] = order.issue || v[7];
      v[8] = order.priority || v[8];
      v[9] = order.assignedTechId || v[9];
      v[10]= order.scheduledAt || v[10];
      v[11]= order.finishedAt || v[11];
      v[14]= order.notes || v[14];
      values[i] = v;
      sh.getRange(1,1,values.length,values[0].length).setValues(values);
      return { ok:true };
    }
  }
  return { ok:false, message:'No existe' };
}

// Subir archivos (fotos / firma)
function uploadFile(orderId, base64, filename, type) {
  // base64 dataURL or raw base64
  const folder = getDriveFolder();
  const blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',').pop()), 'application/octet-stream', filename);
  const file = folder.createFile(blob);
  const url = file.getUrl();
  // Anexa en FILES
  const sh = getSheet(SHEETS.FILES);
  sh.appendRow([file.getId(), orderId, type, filename, url, new Date()]);
  return { ok:true, fileId:file.getId(), url };
}

// Generar PDF desde plantilla
function generateOrderPdf(orderId) {
  const res = getOrder(orderId);
  if (!res.ok) return res;
  const order = res.order;

  const template = HtmlService.createTemplateFromFile('Html/pdf_template');
  template.BRAND = BRAND;
  template.order = order;

  // Archivos (fotos) asociados
  const sh = getSheet(SHEETS.FILES);
  const values = sh.getDataRange().getValues();
  const photos = [];
  for (let i=1;i<values.length;i++){
    if (values[i][1] === orderId && values[i][2] === 'photo') {
      photos.push({name: values[i][3], url: values[i][4], id: values[i][0]});
    }
  }
  template.photos = photos;

  const html = template.evaluate().getContent();
  const blob = Utilities.newBlob(html, 'text/html', orderId + '.html');
  const pdf = blob.getAs('application/pdf');
  const folder = getDriveFolder();
  const file = folder.createFile(pdf).setName(orderId + '_orden_salida.pdf');

  // Guarda referencia
  const shO = getSheet(SHEETS.ORDERS);
  const data = shO.getDataRange().getValues();
  for (let i=1;i<data.length;i++){
    if (data[i][0] === orderId) {
      data[i][13] = file.getId();
      shO.getRange(1,1,data.length,data[0].length).setValues(data);
      break;
    }
  }
  return { ok:true, fileId:file.getId(), url:file.getUrl() };
}
