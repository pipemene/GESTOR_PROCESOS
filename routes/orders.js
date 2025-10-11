import express from 'express';
import jwt from 'jsonwebtoken';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { SPREADSHEET_ID, ORDERS_SHEET, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, JWT_SECRET } from '../config.js';

const router = express.Router();

/* ============== Helpers ============== */
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token faltante' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { username, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function getSheet() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: (GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[ORDERS_SHEET];
  if (!sheet) throw new Error(`No existe la hoja "${ORDERS_SHEET}" en el spreadsheet`);
  return sheet;
}

function mapRow(row) {
  return {
    codigo: row.Codigo || '',
    arrendatario: row.Arrendatario || '',
    telefono: row.Telefono || '',
    tecnico: row.Tecnico || '',
    observacion: row.Observacion || '',
    estado: row.Estado || '',
    fecha: row.FechaCreacion || '',
  };
}

function requireSuperAdmin(req, res) {
  if (!req.user || (req.user.role !== 'SuperAdmin' && req.user.role !== 'admin')) {
    res.status(403).json({ error: 'Solo el SuperAdmin o admin pueden realizar esta acción' });
    return false;
  }
  return true;
}

/* ============== Routes ============== */

// GET /api/orders  (listar + filtros ?codigo=&arrendatario=&estado=&tecnico=)
router.get('/', verifyToken, async (req, res) => {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();
    let data = rows.map(mapRow);

    const { codigo, arrendatario, estado, tecnico } = req.query;
    if (codigo) data = data.filter(o => String(o.codigo).toLowerCase().includes(String(codigo).toLowerCase()));
    if (arrendatario) data = data.filter(o => String(o.arrendatario).toLowerCase().includes(String(arrendatario).toLowerCase()));
    if (estado) data = data.filter(o => String(o.estado).toLowerCase() === String(estado).toLowerCase());
    if (tecnico) data = data.filter(o => String(o.tecnico).toLowerCase() === String(tecnico).toLowerCase());

    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    console.error('❌ Error al obtener órdenes:', error);
    return res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
});

// POST /api/orders (crear)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { codigo, arrendatario, telefono, observacion, tecnico } = req.body || {};

    if (!codigo || !arrendatario || !telefono || !observacion) {
      return res.status(400).json({ error: 'Campos requeridos: codigo, arrendatario, telefono, observacion' });
    }

    const sheet = await getSheet();

    // Validar duplicados por codigo
    const rows = await sheet.getRows();
    if (rows.some(r => (r.Codigo || '').trim().toLowerCase() === String(codigo).trim().toLowerCase())) {
      return res.status(409).json({ error: `Ya existe una orden con el código ${codigo}` });
    }

    await sheet.addRow({
      Codigo: codigo,
      Arrendatario: arrendatario,
      Telefono: telefono,
      Tecnico: tecnico && tecnico.trim() ? tecnico : 'Sin asignar',
      Observacion: observacion,
      Estado: 'Pendiente',
      FechaCreacion: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
    });

    return res.json({ ok: true, message: '✅ Orden creada correctamente' });
  } catch (error) {
    console.error('❌ Error al crear orden:', error);
    return res.status(500).json({ error: 'Error al crear la orden' });
  }
});

// PUT /api/orders/:codigo (editar todos los campos)
router.put('/:codigo', verifyToken, async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { codigo } = req.params;
    const { nuevoCodigo, arrendatario, telefono, tecnico, observacion, estado } = req.body || {};

    const sheet = await getSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => (r.Codigo || '').trim().toLowerCase() === String(codigo).trim().toLowerCase());
    if (!row) return res.status(404).json({ error: `No se encontró la orden con código ${codigo}` });

    if (nuevoCodigo != null && String(nuevoCodigo).trim() !== '') row.Codigo = nuevoCodigo;
    if (arrendatario != null) row.Arrendatario = arrendatario;
    if (telefono != null) row.Telefono = telefono;
    if (tecnico != null) row.Tecnico = tecnico;
    if (observacion != null) row.Observacion = observacion;
    if (estado != null) row.Estado = estado;

    await row.save();
    return res.json({ ok: true, message: '✅ Orden actualizada' });
  } catch (error) {
    console.error('❌ Error al editar orden:', error);
    return res.status(500).json({ error: 'Error al editar la orden' });
  }
});

// DELETE /api/orders/:codigo (eliminar)
router.delete('/:codigo', verifyToken, async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { codigo } = req.params;

    const sheet = await getSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => (r.Codigo || '').trim().toLowerCase() === String(codigo).trim().toLowerCase());
    if (!row) return res.status(404).json({ error: `No se encontró la orden con código ${codigo}` });

    await row.delete();
    return res.json({ ok: true, message: '🗑️ Orden eliminada' });
  } catch (error) {
    console.error('❌ Error al eliminar orden:', error);
    return res.status(500).json({ error: 'Error al eliminar la orden' });
  }
});

export default router;
