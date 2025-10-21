// ======================================================
// 🧱 routes/orders.js
// Blue Home Gestor - Módulo de órdenes de trabajo
// ======================================================

import express from "express";
import multer from "multer";
import {
  getSheetData,
  appendRow,
  updateCell,
  getExcelColumnName,
} from "../services/sheetsService.js";
import {
  uploadFileToDrive,
  uploadBase64ImageToDrive,
  createOrderFolder,
} from "../services/driveService.js";
import { sendOrderNotification } from "../services/mailService.js";

const router = express.Router();
const upload = multer();
const SHEET_NAME = process.env.ORDERS_SHEET || "Ordenes";

// ======================================================
// 🔹 Listar todas las órdenes
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = row[j] || ""));
      obj.fila = i + 2;
      return obj;
    });

    res.json(data);
  } catch (e) {
    console.error("❌ Error al obtener órdenes:", e);
    res.status(500).json({ error: "Error al cargar órdenes" });
  }
});

// ======================================================
// 🔹 Crear nueva orden
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { codigo, cliente, telefono, descripcion, tecnico, estado } = req.body;
    if (!codigo || !cliente || !descripcion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const nueva = [
      codigo,
      cliente,
      telefono || "",
      descripcion,
      tecnico || "Sin asignar",
      estado || "Disponible",
      "",
      "",
      "",
    ];

    await appendRow(SHEET_NAME, nueva);
    console.log(`✅ Nueva orden creada: ${codigo}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

// ======================================================
// 🔹 Subir foto (Antes / Después)
// ======================================================
router.post("/:fila/upload-photo", upload.single("foto"), async (req, res) => {
  try {
    const { tipo } = req.body;
    const { fila } = req.params;

    if (!req.file) return res.status(400).json({ error: "No se envió archivo" });

    const driveLink = await uploadFileToDrive(req.file, tipo || "Foto");
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.toLowerCase());

    const colIdx = headers.findIndex((h) => h.includes(tipo.toLowerCase()));
    if (colIdx === -1) {
      console.warn(`⚠️ No se encontró columna para tipo: ${tipo}`);
      return res.json({ ok: true, warning: "Columna no encontrada" });
    }

    const colLetter = getExcelColumnName(colIdx);
    await updateCell(SHEET_NAME, `${colLetter}${fila}`, driveLink);

    console.log(`✅ Foto (${tipo}) subida correctamente a fila ${fila}`);
    res.json({ ok: true, driveLink });
  } catch (e) {
    console.error("❌ Error al subir foto:", e);
    res.status(500).json({ error: "Error al subir foto" });
  }
});

// ======================================================
// 🔹 Guardar firma (imagen base64)
// ======================================================
router.post("/:fila/sign", async (req, res) => {
  try {
    const { firmaData, nombreFirmante } = req.body;
    const { fila } = req.params;
    if (!firmaData) return res.status(400).json({ error: "Falta firma" });

    const driveLink = await uploadBase64ImageToDrive(firmaData, `Firma_${nombreFirmante || "Inquilino"}.png`);

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.toLowerCase());
    const idxFirma = headers.findIndex((h) => /firma/.test(h));

    if (idxFirma >= 0) {
      const colLetter = getExcelColumnName(idxFirma);
      await updateCell(SHEET_NAME, `${colLetter}${fila}`, driveLink);
    }

    console.log(`✅ Firma guardada para fila ${fila}`);
    res.json({ ok: true, link: driveLink });
  } catch (e) {
    console.error("❌ Error al guardar firma:", e);
    res.status(500).json({ error: "Error al guardar firma" });
  }
});

// ======================================================
// 🔹 Guardar retroalimentación / materiales
// ======================================================
router.post("/update", async (req, res) => {
  try {
    const { fila, materiales, observaciones } = req.body;
    if (!fila) return res.status(400).json({ error: "Fila requerida" });

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.toLowerCase());

    const campos = { materiales, observaciones };

    for (const [key, value] of Object.entries(campos)) {
      if (!value) continue;
      const colIdx = headers.findIndex((h) => h.includes(key.toLowerCase()));
      if (colIdx >= 0) {
        const colLetter = getExcelColumnName(colIdx);
        await updateCell(SHEET_NAME, `${colLetter}${fila}`, value);
      }
    }

    console.log(`✏️ Retroalimentación actualizada (fila ${fila})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar orden:", e);
    res.status(500).json({ error: "Error al actualizar orden" });
  }
});

// ======================================================
// 🔹 Finalizar orden
// ======================================================
router.post("/:fila/finish", async (req, res) => {
  try {
    const { fila } = req.params;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.toLowerCase());
    const row = rows[fila - 1];

    if (!row) return res.status(404).json({ error: "Orden no encontrada" });

    const codigo = row[headers.findIndex((h) => h.includes("codigo"))] || "Sin código";
    const descripcion = row[headers.findIndex((h) => h.includes("descripcion"))] || "";
    const tecnico = row[headers.findIndex((h) => h.includes("tecnico"))] || "";
    const cliente = row[headers.findIndex((h) => h.includes("cliente"))] || "";

    // Crear carpeta de Drive específica
    const orderFolder = await createOrderFolder(codigo);
    const driveLink = `https://drive.google.com/drive/folders/${orderFolder}`;

    // Cambiar estado a FINALIZADA
    const idxEstado = headers.findIndex((h) => /estado/.test(h));
    if (idxEstado >= 0) {
      const colLetter = getExcelColumnName(idxEstado);
      await updateCell(SHEET_NAME, `${colLetter}${fila}`, "Finalizada");
    }

    // Guardar link de carpeta en Sheets (columna "Drive" si existe)
    const idxDrive = headers.findIndex((h) => /drive|evidencia/.test(h));
    if (idxDrive >= 0) {
      const colLetter = getExcelColumnName(idxDrive);
      await updateCell(SHEET_NAME, `${colLetter}${fila}`, driveLink);
    }

    // Enviar correo automático a Dayan
    await sendOrderNotification(codigo, driveLink, descripcion, tecnico, cliente);

    console.log(`✅ Orden ${codigo} finalizada y notificada a reparaciones@bluehomeinmo.co`);
    res.json({ ok: true, driveLink });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

export { router };
