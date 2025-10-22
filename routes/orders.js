// ======================================================
// 📄 routes/orders.js
// Blue Home Gestor — Módulo de Órdenes
// ======================================================

import express from "express";
import multer from "multer";
import fs from "fs";
import {
  getSheetData,
  appendRow,
  updateCell,
} from "../services/sheetsService.js";
import { uploadFileToDrive } from "../services/driveService.js";
import { sendMail } from "../services/mailService.js";

const router = express.Router();
const SHEET_NAME = process.env.ORDERS_SHEET || "Ordenes";

// ======================================================
// ⚙️ Configuración de Multer — guarda en carpeta uploads/
// ======================================================
const upload = multer({ dest: "uploads/" });

// ======================================================
// 🔹 GET: Listar órdenes desde Google Sheets
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2;
      return obj;
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error al obtener órdenes:", err.message);
    res.status(500).json({ error: "Error al cargar órdenes" });
  }
});

// ======================================================
// 🔹 POST: Crear nueva orden en Google Sheets
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { codigo, inquilino, descripcion, tecnico, estado } = req.body;

    if (!codigo || !inquilino || !descripcion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    await appendRow(SHEET_NAME, [
      codigo,
      inquilino,
      descripcion,
      tecnico || "Sin asignar",
      estado || "Pendiente",
      new Date().toLocaleString("es-CO"),
    ]);

    console.log(`✅ Orden creada correctamente: ${codigo}`);
    res.json({ ok: true, message: "Orden creada correctamente" });
  } catch (err) {
    console.error("❌ Error al crear orden:", err.message);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

// ======================================================
// 🔹 POST: Subir foto (Antes / Después)
// ======================================================
router.post("/:codigo/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = req.body.tipo || "Foto";
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Archivo no recibido" });
    }

    // ✅ Subir a Drive
    const driveFile = await uploadFileToDrive(file, `${tipo}_${codigo}`);

    // ✅ Eliminar el archivo temporal
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);

    console.log(`📸 ${tipo} subida correctamente para orden ${codigo}`);
    res.json({ ok: true, link: driveFile });
  } catch (err) {
    console.error("❌ Error al subir foto:", err.message);
    res.status(500).json({ error: "Error al subir foto" });
  }
});

// ======================================================
// 🔹 POST: Actualizar estado o comentarios de la orden
// ======================================================
router.post("/:fila/update", async (req, res) => {
  try {
    const { fila } = req.params;
    const { estado, observacion } = req.body;

    if (!fila || isNaN(fila)) {
      return res.status(400).json({ error: "Fila inválida" });
    }

    if (estado) {
      await updateCell(SHEET_NAME, `${SHEET_NAME}!E${fila}`, estado);
    }
    if (observacion) {
      await updateCell(SHEET_NAME, `${SHEET_NAME}!F${fila}`, observacion);
    }

    console.log(`✏️ Orden actualizada correctamente (fila ${fila})`);
    res.json({ ok: true, message: "Orden actualizada correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar orden:", err.message);
    res.status(500).json({ error: "Error al actualizar orden" });
  }
});

// ======================================================
// 🔹 POST: Finalizar orden y enviar correo a Dayan
// ======================================================
router.post("/:codigo/finalizar", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { fila } = req.body;

    if (!fila || !codigo) {
      return res.status(400).json({ error: "Datos insuficientes para finalizar" });
    }

    // Actualiza estado en la hoja
    await updateCell(SHEET_NAME, `${SHEET_NAME}!E${fila}`, "Finalizada");

    // Enviar correo a Dayan
    const destinatario = "reparaciones@bluehomeinmo.co";
    const asunto = `🔧 Orden ${codigo} finalizada`;
    const mensaje = `
      <h3>Orden finalizada</h3>
      <p>La orden con código <b>${codigo}</b> ha sido finalizada por el técnico.</p>
      <p>Por favor, revisa y valida los precios correspondientes.</p>
    `;

    await sendMail(destinatario, asunto, mensaje);
    console.log(`📨 Correo enviado a Dayan (${destinatario})`);

    res.json({ ok: true, message: "Orden finalizada y correo enviado" });
  } catch (err) {
    console.error("❌ Error al finalizar orden:", err.message);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

export default router;
