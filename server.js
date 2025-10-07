// server.js
// Gestor de Procesos Blue Home v1 - Backend Express
// Usa variables de entorno: PORT, GAS_URL

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const GAS_URL = process.env.GAS_URL;

if (!GAS_URL) {
  console.warn("[WARN] Falta variable de entorno GAS_URL. Configúrala en Railway.");
}

// --------- Helpers ---------
async function callGAS(action, payload = {}) {
  if (!GAS_URL) throw new Error("GAS_URL no configurada");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if (!res.ok || data.status !== "ok") {
    const msg = data?.message || `Error en acción ${action}`;
    throw new Error(msg);
  }
  return data.data;
}

// --------- API ---------
app.get("/api/test", (req, res) => {
  res.json({
    ok: true,
    now: new Date().toISOString(),
    env: {
      PORT,
      GAS_URL_present: !!GAS_URL
    }
  });
});

app.post("/api/login", async (req, res) => {
  try {
    const { usuario, clave } = req.body || {};
    const data = await callGAS("login", { usuario, clave });
    res.json({ status: "ok", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: String(err.message || err) });
  }
});

app.post("/api/createOrder", async (req, res) => {
  try {
    const payload = req.body || {};
    const data = await callGAS("createOrder", payload);
    res.json({ status: "ok", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: String(err.message || err) });
  }
});

app.post("/api/listOrders", async (req, res) => {
  try {
    const { usuario, rol } = req.body || {};
    const data = await callGAS("listOrders", { usuario, rol });
    res.json({ status: "ok", data });
  } catch (err) {
    res.status(400).json({ status: "error", message: String(err.message || err) });
  }
});

// --------- Static Frontend ---------
app.use(express.static(".")); // sirve index.html y assets en la raíz del proyecto

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

app.listen(PORT, () => {
  console.log(`[OK] Gestor de Procesos Blue Home v1 escuchando en puerto ${PORT}`);
});
