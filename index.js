// index.js — servidor Express básico para producción en Railway
import express from "express";
import fetch from "node-fetch";
import { config } from "./config.js";

const app = express();
app.use(express.json({ limit: "15mb" }));

// Healthcheck
app.get("/", (_req, res) => {
  res.json({ status: "ok", env: config.env, at: new Date().toISOString() });
});

// Config para clientes (Apps Script u otros)
app.get("/api/config", (_req, res) => {
  res.json({
    port: config.port,
    spreadsheet: { id: config.sheet.id, url: config.sheet.url },
    drive: { id: config.drive.id, url: config.drive.url },
    appscript: { url: config.appscript.webappUrl },
  });
});

// (Opcional) Proxies de ejemplo hacia Apps Script si exponen endpoints compatibles
// Nota: El Apps Script incluido es una WebApp de UI. Para un API REST,
// añade al Apps Script un handler que procese e.parameter.fn o método doPost(e).
app.get("/api/orders", async (_req, res) => {
  return res.status(200).json({ ok: true, hint: "Implementar proxy a Apps Script o acceso directo a Sheets" });
});

app.post("/api/orders", async (req, res) => {
  // Aquí podrías POSTear a tu Apps Script si implementas doPost
  // o escribir en Sheets usando Google API (requiere credenciales de servicio).
  const payload = req.body || {};
  return res.status(201).json({ ok: true, received: payload, hint: "Implementar escritura real (Apps Script o Google API)" });
});

// Start
app.listen(config.port, () => {
  console.log(`✅ Servidor en puerto ${config.port}`);
});
