import express from 'express';
import jwt from 'jsonwebtoken';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT_SECRET, SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, ORDERS_SHEET } from '../config.js';

const router = express.Router();

// 🧩 Middleware para verificar token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'Token faltante' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token inválido' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token no válido' });
    req.user = decoded;
    next();
  });
}

// 🧩 Función para conectar con Google Sheets
async function getOrdersSheet() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  return doc.sheetsByTitle[ORDERS_SHEET];
}

// 📋 Obtener todas las órdenes
router.get('/', verifyToken, async (req, res) => {
  try {
    const sheet = await getOrdersSheet();
    const rows = await sheet.getRows();

    const data = rows.map(row => ({
      codigo: row.Codigo || '',
      arrendatario: row.Arrendatario || '',
      telefono: row.Telefono || '',
      tecnico: row.Tecnico || '',
      observacion: row.Observacion || '',
      estado: row.Estado || '',
      fecha: row.FechaCreacion || '',
    }));

    res.json(data);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
});

// 🛠 Crear nueva orden
router.post('/', verifyToken, async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;
    const { role, username } = req.user;

    if (!codigo || !arrendatario || !telefono || !observacion) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // 🔐 Validar rol permitido
    if (role !== 'SuperAdmin' && role !== 'admin') {
      return res.status(403).json({ error: 'Solo el SuperAdmin o admin pueden crear órdenes' });
    }

    const sheet = await getOrdersSheet();
    await sheet.addRow({
      Codigo: codigo,
      Arrendatario: arrendatario,
      Telefono: telefono,
      Tecnico: tecnico || 'Sin asignar',
      Observacion: observacion,
      Estado: 'Pendiente',
      FechaCreacion: new Date().toLocaleString('es-CO'),
      CreadoPor: username,
    });

    res.json({ success: true, message: 'Orden creada correctamente' });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

export default router;
