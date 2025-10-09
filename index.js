
import express from "express";
import { config } from "./config.js";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Healthcheck
app.get("/", (req, res) => {
  res.json({ status: "ok", env: config.env, at: new Date().toISOString() });
});

// Exponer configuración
app.get("/api/config", (req, res) => {
  res.json({
    port: config.port,
    spreadsheet: config.sheet.url,
    drive: config.drive.url,
    appscript: config.appscript.webappUrl,
  });
});

// Endpoint de prueba para crear orden (proxy a Apps Script)
app.post("/api/orders", async (req, res) => {
  try {
    const response = await fetch(config.appscript.webappUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(config.port, () => {
  console.log(`✅ Servidor corriendo en puerto ${config.port}`);
});
