import express from 'express';
import { listOrders, createOrder, assignTech, getSummary } from '../services/sheetsService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rol = String(req.query.rol || req.user?.role || 'superadmin');
    const user = String(req.query.user || req.user?.usuario || '');
    const data = await listOrders(rol, user);
    res.json({ ok:true, total:data.length, data });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/', async (req, res) => {
  try { res.json(await createOrder(req.body || {})); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.put('/assign', async (req, res) => {
  try { res.json(await assignTech(req.body?.codigo, req.body?.tecnico)); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/summary', async (_req, res) => {
  try { res.json({ ok:true, summary: await getSummary() }); }
  catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

export default router;
