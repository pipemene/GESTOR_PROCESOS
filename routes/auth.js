import express from 'express';
import jwt from 'jsonwebtoken';
import { getUsers } from '../services/sheetsService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { usuario, clave } = req.body || {};
    if (!usuario || !clave) return res.status(400).json({ ok:false, message:'Falta usuario o clave' });
    const users = await getUsers();
    const found = users.find(u => String(u.usuario).trim().toLowerCase() === String(usuario).trim().toLowerCase());
    if (!found || String(found.clave) != String(clave)) return res.status(401).json({ ok:false, message:'Credenciales inválidas' });
    const payload = { usuario: found.usuario, role: found.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ ok:true, token, role: found.rol, usuario: found.usuario });
  } catch (e) { res.status(500).json({ ok:false, message:e.message }); }
});

export function authGuard(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok:false, message:'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ ok:false, message:'Token inválido' }); }
}

export function roleGuard(requiredRole) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ ok:false, message:'No autorizado' });
    if (String(req.user.role).toLowerCase() !== String(requiredRole).toLowerCase())
      return res.status(403).json({ ok:false, message:'Permisos insuficientes' });
    next();
  };
}

export default router;
