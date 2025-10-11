import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../services/sheetsService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try { res.json({ ok:true, total:(await getUsers()).length, data: await getUsers() }); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { usuario, clave, rol } = req.body || {};
    if (!usuario || !clave || !rol) return res.status(400).json({ ok:false, message:'Campos requeridos' });
    res.json(await createUser({ usuario, clave, rol }));
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.put('/:usuario', async (req, res) => {
  try { res.json(await updateUser(req.params.usuario, { clave: req.body?.clave, rol: req.body?.rol })); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.delete('/:usuario', async (req, res) => {
  try { res.json(await deleteUser(req.params.usuario)); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

export default router;
