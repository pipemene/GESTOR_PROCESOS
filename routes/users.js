import express from 'express';
import jwt from 'jsonwebtoken';
import { getSheetData, appendRow, updateCell, deleteRow } from '../services/sheetsService.js';

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

// 🔹 Listar usuarios
router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await getSheetData(process.env.USERS_SHEET);
    const headers = data[0];
    const users = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((key, i) => (obj[key] = row[i] || ''));
      return obj;
    });
    res.json(users);
  } catch (err) {
    console.error('❌ Error al leer usuarios:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

export default router;
