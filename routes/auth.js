import express from 'express';
import jwt from 'jsonwebtoken';
import { getSheetData } from '../services/sheetsService.js';

const router = express.Router();

// 🔹 Login
router.post('/login', async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    if (!usuario || !clave) return res.status(400).json({ error: 'Campos requeridos' });

    const data = await getSheetData(process.env.USERS_SHEET);
    const headers = data[0];
    const users = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((key, i) => (obj[key] = row[i] || ''));
      return obj;
    });

    const user = users.find(u => u.usuario === usuario && u.clave === clave);
    if (!user) return res.status(401).json({ error: 'Usuario o clave incorrectos' });

    const token = jwt.sign(
      { usuario: user.usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: user.usuario, rol: user.rol });
  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ error: 'Error interno al iniciar sesión' });
  }
});

export default router;
