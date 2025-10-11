import express from 'express';
import jwt from 'jsonwebtoken';
import { getSheetData } from '../services/sheetsService.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Debe ingresar usuario y contraseña' });

    const users = await getSheetData(process.env.USERS_SHEET);

    // Verificamos encabezados
    const headers = users[0];
    const userIndex = headers.findIndex((h) => h.toLowerCase() === 'usuario');
    const passIndex = headers.findIndex((h) => h.toLowerCase() === 'clave');
    const roleIndex = headers.findIndex((h) => h.toLowerCase() === 'rol');

    if (userIndex === -1 || passIndex === -1)
      return res.status(500).json({ error: 'Encabezados inválidos en la hoja Usuarios' });

    const userRow = users.find(
      (row, i) =>
        i > 0 &&
        row[userIndex]?.trim()?.toLowerCase() === username.trim().toLowerCase()
    );

    if (!userRow)
      return res.status(401).json({ error: 'Usuario no encontrado en la hoja' });

    const storedPassword = userRow[passIndex]?.trim();
    if (storedPassword !== password.trim())
      return res.status(401).json({ error: 'Contraseña incorrecta' });

    const role = userRow[roleIndex] || 'tecnico';
    const token = jwt.sign({ username, role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({ token, role });
  } catch (err) {
    console.error('❌ Error en login:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default router;
