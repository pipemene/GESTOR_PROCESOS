// routes/orders.js
import express from "express";
import multer from "multer";
import fs from "fs";
import {
  getSheetData,
  appendRow,
  updateCell,
  deleteRow
} from "../services/sheetsService.js";
import { uploadFileToDrive } from "../services/driveService.js";

const router = express.Router();
const SHEET_NAME = "ordenes";

// Configuración de multer (para archivos temporales)
const upload = multer({ dest: "/tmp" });

/* ======================================================
   🔹 GET: listar todas las órdenes
====================================================== */
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = h.trim().toLowerCase();
        obj[key.normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = (r[i] || "").trim();
      });
      return obj;
    });

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(data);
  } catch (e) {
    console.error("❌ Error al obtener órdenes:", e);
    res.status(500).json({ error: "Error al cargar órdenes" });
  }
});

/* ======================================================
   🔹 POST: crear nueva orden
====================================================== */
router.post("/", async (req, res) => {
  try {
    const { cliente, fecha, inquilino, telefono, codigo, descripcion, tecnico, estado } = req.body;
    if (!cliente || !fecha || !descripcion) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    await appendRow(SHEET_NAME, [
      cliente,
      fecha,
      inquilino || "",
      telefono || "",
      codigo || "",
      descripcion,
      tecnico || "Sin asignar",
      estado || "Pendiente",
      "", // FotoAntes
      "", // FotoDespues
      "", // Firma
      "", // NombreFirmante
      "", // Materiales
      ""  // Observaciones
    ]);

    console.log(`✅ Nueva orden creada correctamente para ${cliente}`);
    res.json({ ok: true, message: "Orden creada correctamente" });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

/* ======================================================
   🔹 PATCH: actualizar campos de una orden
====================================================== */
router.patch("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idxCodigo = headers.findIndex(h => h === "codigo");
    if (idxCodigo < 0) throw new Error("No existe columna Código");

    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && (r[idxCodigo] || "").trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    for (const [key, value] of Object.entries(updates)) {
      const colIdx = headers.findIndex(h => h === key.toLowerCase());
      if (colIdx >= 0 && value !== undefined && value !== null) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex + 1}`, value);
      }
    }

    console.log(`✏️ Orden ${codigo} actualizada correctamente`);
    res.json({ ok: true, message: `Orden ${codigo} actualizada correctamente` });
  } catch (e) {
    console.error("❌ Error al editar orden:", e);
    res.status(500).json({ error: "Error al editar orden" });
  }
});

/* ======================================================
   🔹 POST: subir fotos a Drive (antes y después)
====================================================== */
router.post("/:codigo/upload", upload.fields([{ name: "fotoAntes" }, { name: "fotoDespues" }]), async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idxCodigo = headers.findIndex(h => h === "codigo");
    if (idxCodigo < 0) throw new Error("No existe columna Código");

    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && (r[idxCodigo] || "").trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const fotoAntes = req.files["fotoAntes"]?.[0];
    const fotoDespues = req.files["fotoDespues"]?.[0];

    const updates = {};

    if (fotoAntes) {
      const driveFile = await uploadFileToDrive(fotoAntes.path, `FotoAntes_${codigo}.jpg`);
      updates["fotoantes"] = driveFile.webViewLink;
    }

    if (fotoDespues) {
      const driveFile = await uploadFileToDrive(fotoDespues.path, `FotoDespues_${codigo}.jpg`);
      updates["fotodespues"] = driveFile.webViewLink;
    }

    for (const [key, value] of Object.entries(updates)) {
      const colIdx = headers.findIndex(h => h === key);
      if (colIdx >= 0 && value) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex + 1}`, value);
      }
    }

    console.log(`📸 Fotos subidas correctamente para orden ${codigo}`);
    res.json({ ok: true, message: "Fotos subidas correctamente" });
  } catch (e) {
    console.error("❌ Error al subir fotos:", e);
    res.status(500).json({ error: "Error al subir fotos" });
  }
});

/* ======================================================
   🔹 POST: subir firma del inquilino
====================================================== */
router.post("/:codigo/firma", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { nombre, firma } = req.body;
    if (!firma) return res.status(400).json({ error: "Firma requerida" });

    const base64Data = firma.replace(/^data:image\/png;base64,/, "");
    const tempPath = `/tmp/Firma_${codigo}.png`;
    fs.writeFileSync(tempPath, base64Data, "base64");

    const driveFile = await uploadFileToDrive(tempPath, `Firma_${nombre}_${codigo}.png`);
    fs.unlinkSync(tempPath);

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idxCodigo = headers.findIndex(h => h === "codigo");
    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && (r[idxCodigo] || "").trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const idxFirma = headers.findIndex(h => h === "firma");
    const idxFirmante = headers.findIndex(h => h === "nombrefirmante");
    if (idxFirma >= 0) await updateCell(SHEET_NAME, `${SHEET_NAME}!${String.fromCharCode(65 + idxFirma)}${rowIndex + 1}`, driveFile.webViewLink);
    if (idxFirmante >= 0 && nombre) await updateCell(SHEET_NAME, `${SHEET_NAME}!${String.fromCharCode(65 + idxFirmante)}${rowIndex + 1}`, nombre);

    console.log(`✍️ Firma guardada en Drive para ${codigo}`);
    res.json({ ok: true, message: "Firma guardada correctamente" });
  } catch (e) {
    console.error("❌ Error al guardar firma:", e);
    res.status(500).json({ error: "Error al guardar firma" });
  }
});

/* ======================================================
   🔹 POST: finalizar orden
====================================================== */
router.post("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idxCodigo = headers.findIndex(h => h === "codigo");
    const idxEstado = headers.findIndex(h => h === "estado");

    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && (r[idxCodigo] || "").trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const letra = String.fromCharCode("A".charCodeAt(0) + idxEstado);
    await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex + 1}`, "Finalizada");

    console.log(`✅ Orden ${codigo} finalizada`);
    res.json({ ok: true, message: "Orden finalizada correctamente" });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

/* ======================================================
   🔹 DELETE: eliminar orden
====================================================== */
router.delete("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idxCodigo = headers.findIndex(h => h === "codigo");

    const rowIndex = rows.findIndex((r, i) =>
      i > 0 && (r[idxCodigo] || "").trim().toLowerCase() === codigo.trim().toLowerCase()
    );
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    await deleteRow(SHEET_NAME, rowIndex + 1);
    console.log(`🗑️ Orden ${codigo} eliminada correctamente`);
    res.json({ ok: true, message: `Orden ${codigo} eliminada correctamente` });
  } catch (e) {
    console.error("❌ Error al eliminar orden:", e);
    res.status(500).json({ error: "Error al eliminar orden" });
  }
});

export { router };
