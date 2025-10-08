import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const GAS_URL = process.env.GAS_URL;
const publicDir = path.resolve(__dirname, '../frontend');
app.use(express.static(publicDir));

app.get('/api/test', async (req, res) => {
  try {
    const resp = await fetch(`${GAS_URL}?action=ping`);
    const data = await resp.text();
    res.json({ ok: true, msg: data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    const resp = await fetch(`${GAS_URL}?action=login&usuario=${usuario}&clave=${clave}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Servidor BlueHome activo en puerto ${PORT}`));