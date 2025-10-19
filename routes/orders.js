// routes/orders.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import {
  getSheetData,
  appendRow,
  updateCell
} from "../services/sheetsService.js";

import {
  uploadFileBufferToDrive,
  uploadBase64ImageToDrive,
  uploadPDFToDrive
} from "../services/driveService.js";

import { generateOrderPDF } from "../services/pdfService.js";

export const router = express.Router();
const upload = multer();
const SHEET_NAME = "Órdenes";

// ======================================================
// 🔹 OBTENER TODAS LAS ÓRDENES
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2; // Fila real en la hoja
      return obj;
    });

    res.json(data);
  } catch (e) {
    console.error("❌ Error al obtener órdenes:", e);
    res.status(500).json({ error: "Error al cargar órdenes" });
  }
});

// ======================================================
// 🔹 CREAR NUEVA ORDEN (Arrendamiento)
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, descripcion, tecnico } = req.body;

    if (!codigo || !arrendatario || !telefono || !descripcion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const estado = "Pendiente";
    const nuevaFila = [
      codigo,
      arrendatario,
      telefono,
      tecnico || "Sin asignar",
      estado,
      descripcion,
      "", // materiales
      "", // trabajo
      "", // firma
      "", // valor
      "", // factura
    ];

    await appendRow(SHEET_NAME, nuevaFila);
    console.log(`✅ Nueva orden creada: ${codigo}`);

    res.json({ ok: true, message: "Orden creada correctamente." });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

// ======================================================
// 🔹 SUBIR FOTO (ANTES / DESPUÉS)
// ======================================================
router.post("/:codigo/upload-photo", upload.single("file"), async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = req.body.tipo?.toLowerCase();

    if (!req.file || !["antes", "despues"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo o archivo inválido" });
    }

    const { viewLink } = await uploadFileBufferToDrive(
      req.file,
      `${tipo}_${Date.now()}.jpg`,
      codigo
    );

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
    const rowIndex = rows.findIndex(r => (r[idxCodigo] || "") === codigo);

    if (rowIndex > 0) {
      const colName = tipo === "antes" ? /foto.?antes/i : /foto.?despues/i;
      const colIdx = headers.findIndex(h => colName.test(h));
      if (colIdx >= 0) {
        const letter = String.fromCharCode(65 + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letter}${rowIndex + 1}`, viewLink);
      }
    }

    res.json({ ok: true, url: viewLink });
  } catch (e) {
    console.error("❌ Error al subir foto:", e);
    res.status(500).json({ error: "Error al subir foto" });
  }
});

// ======================================================
// 🔹 GUARDAR RETROALIMENTACIÓN (Reparaciones)
// ======================================================
router.post("/:codigo/feedback", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { materiales, trabajo, valor } = req.body;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
    const rowIndex = rows.findIndex(r => (r[idxCodigo] || "") === codigo);

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const setCell = async (colName, value) => {
      const colIdx = headers.findIndex(h => new RegExp(colName, "i").test(h));
      if (colIdx >= 0) {
        const letter = String.fromCharCode(65 + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letter}${rowIndex + 1}`, value);
      }
    };

    await setCell("material", materiales);
    await setCell("trabajo", trabajo);
    await setCell("valor", valor || "");

    console.log(`✏️ Retroalimentación registrada para ${codigo}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error en feedback:", e);
    res.status(500).json({ error: "Error en feedback" });
  }
});

// ======================================================
// 🔹 FIRMAR ORDEN (inquilino o responsable)
// ======================================================
router.post("/:codigo/sign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { firma } = req.body;
    if (!firma) return res.status(400).json({ error: "Firma requerida" });

    const { viewLink } = await uploadBase64ImageToDrive(
      firma,
      `firma_${Date.now()}.png`,
      codigo
    );

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
    const rowIndex = rows.findIndex(r => (r[idxCodigo] || "") === codigo);

    if (rowIndex > 0) {
      const idxFirma = headers.findIndex(h => /firma/i.test(h));
      const letter = String.fromCharCode(65 + idxFirma);
      await updateCell(SHEET_NAME, `${SHEET_NAME}!${letter}${rowIndex + 1}`, viewLink);
    }

    res.json({ ok: true, url: viewLink });
  } catch (e) {
    console.error("❌ Error al firmar orden:", e);
    res.status(500).json({ error: "Error al subir firma" });
  }
});

// ======================================================
// 🔹 FINALIZAR ORDEN (Facturación - Aitana)
// ======================================================
router.post("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🚀 Finalizando orden ${codigo}...`);

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
    const rowIndex = rows.findIndex(r => (r[idxCodigo] || "") === codigo);

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    // ✅ Actualizar estado
    const idxEstado = headers.findIndex(h => /estado/i.test(h));
    const colEstado = String.fromCharCode(65 + idxEstado);
    await updateCell(SHEET_NAME, `${SHEET_NAME}!${colEstado}${rowIndex + 1}`, "Finalizada");

    // 🧾 Generar PDF técnico
    console.log("🧾 Generando PDF técnico...");
    const pdfPath = await generateOrderPDF(codigo);
    const { viewLink, downloadLink } = await uploadPDFToDrive(pdfPath, codigo);
    try { fs.unlinkSync(pdfPath); } catch {}

    console.log("✅ PDF generado y subido correctamente:", viewLink);
    res.json({
      ok: true,
      message: "Orden finalizada correctamente.",
      pdfView: viewLink,
      pdfDownload: downloadLink
    });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});
