// ======================================================
// 🧾 routes/orders.js — Gestión de órdenes Blue Home
// ======================================================

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { getSheetData, appendRow, updateCell } from "../services/sheetsService.js";
import { uploadFileToDrive } from "../services/driveService.js";
import { sendMail } from "../services/mailService.js";

const router = express.Router();
const SHEET_NAME = "Ordenes";

// ======================================================
// 📁 Configuración de subida de archivos (multer)
// ======================================================
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ======================================================
// 🔹 GET — Listar todas las órdenes
// ======================================================
router.get("/", async (_, res) => {
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
// 🔹 POST — Crear nueva orden
// ======================================================
router.post("/", upload.array("fotos", 10), async (req, res) => {
  try {
    const {
      codigo,
      inquilino,
      telefono,
      descripcion,
      estado,
      tecnico,
      prioridad,
    } = req.body;

    if (!codigo || !inquilino || !descripcion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Subir fotos al Drive (si hay)
    let enlacesFotos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const upload = await uploadFileToDrive(file.path, file.originalname);
        enlacesFotos.push(upload.webViewLink);
        fs.unlinkSync(file.path); // borrar temporal
      }
    }

    await appendRow(SHEET_NAME, [
      codigo,
      inquilino,
      telefono || "",
      descripcion,
      estado || "pendiente",
      tecnico || "Sin asignar",
      prioridad || "Media",
      enlacesFotos.join(", "),
      new Date().toLocaleString("es-CO"),
    ]);

    console.log("✅ Orden creada correctamente");
    res.json({ ok: true, message: "Orden creada correctamente" });
  } catch (err) {
    console.error("❌ Error al crear orden:", err.message);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

// ======================================================
// 🔹 PUT — Finalizar orden
// ======================================================
router.put("/finalizar/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    const { observaciones, firma } = req.body;

    if (!fila || isNaN(fila)) {
      return res.status(400).json({ error: "Número de fila inválido" });
    }

    // Actualizar estado y observaciones
    await updateCell(SHEET_NAME, `Ordenes!E${fila}`, "Finalizada");
    await updateCell(SHEET_NAME, `Ordenes!I${fila}`, observaciones || "");
    await updateCell(SHEET_NAME, `Ordenes!J${fila}`, firma || "");

    // Notificar a Dayan
    const destinatario = "reparaciones@bluehomeinmo.co";
    const asunto = "Nueva orden finalizada en Blue Home";
    const mensaje = `
      <h2>🧾 Nueva orden finalizada</h2>
      <p>La orden número <b>${fila}</b> ha sido finalizada por el técnico.</p>
      <p>Puedes revisarla en el Gestor Blue Home.</p>
    `;

    await sendMail(destinatario, asunto, mensaje);
    console.log(`📨 Correo enviado a Dayan (${destinatario})`);

    res.json({ ok: true, message: "Orden finalizada y correo enviado" });
  } catch (err) {
    console.error("❌ Error al finalizar orden:", err.message);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

// ======================================================
// 🔹 Exportación final corregida
// ======================================================
export { router };
