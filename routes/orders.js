import express from 'express';
import jwt from 'jsonwebtoken';
import { getSheetData, appendRow } from '../services/sheetsService.js';

const router = express.Router();

// Middleware de autenticación
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token faltante' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Token inválido' });
  }
}

// 🔹 Obtener todas las órdenes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await getSheetData(process.env.ORDERS_SHEET);
    const headers = data[0];
    const orders = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((key, i) => (obj[key] = row[i] || ''));
      return obj;
    });
    res.json(orders);
  } catch (err) {
    console.error('❌ Error al leer órdenes:', err);
    res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
});

// 🔹 Crear nueva orden (solo SuperAdmin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Solo el SuperAdmin puede crear órdenes' });
    }

    const { codigo, arrendatario, telefono, observacion, tecnico } = req.body;
    if (!codigo || !arrendatario || !telefono) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const fecha = new Date().toLocaleDateString('es-CO');
    const tecnicoAsignado = tecnico && tecnico !== '' ? tecnico : 'Sin asignar';
    const estado = 'Pendiente';

    const nuevaOrden = [
      fecha,
      codigo,
      arrendatario,
      telefono,
      observacion || '',
      tecnicoAsignado,
      estado
    ];

    await appendRow(process.env.ORDERS_SHEET, nuevaOrden);

    console.log(`✅ Nueva orden creada: ${codigo} (${arrendatario})`);
    res.status(201).json({ message: 'Orden creada correctamente' });
  } catch (err) {
    console.error('❌ Error al crear la orden:', err);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

export default router;
