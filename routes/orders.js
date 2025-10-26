// routes/orders.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";
import { uploadFileToDrive } from "../services/driveService.js";

const router = express.Router();
const SHEET_NAME = "ordenes";

// Configuración de multer (sube a /tmp temporalmente)
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
        obj[h.trim().toLowerCase()] = (r[i] || "").trim();
      });
      return obj;
    });

    // ✅ Asegurar que el contenido se devuelva como JSON real
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
      "",
      "",
      "",
      ""
    ]);

    console.log(`✅ Nueva orden creada correctamente para ${cliente}`);
    res.json({ ok: true, message: "Orden creada correctamente" });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

/* ======================================================
   🔹 PATCH: actualizar orden existente
====================================================== */
router.patch("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    if (idxCodigo < 0) throw new Error("No existe columna Código");

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    for (const [key, value] of Object.entries(updates)) {
      const colIdx = headers.findIndex(
        (h) => h.trim().toLowerCase() === key.trim().toLowerCase()
      );
      if (colIdx >= 0 && value) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, value);
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
   🔹 POST: subir fotos a Drive
====================================================== */
router.post("/:codigo/upload", upload.fields([{ name: "fotoAntes" }, { name: "fotoDespues" }]), async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    if (idxCodigo < 0) throw new Error("No existe columna Código");

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const fotoAntes = req.files["fotoAntes"]?.[0];
    const fotoDespues = req.files["fotoDespues"]?.[0];

    const updates = {};

    if (fotoAntes) {
      const driveFile = await uploadFileToDrive(fotoAntes.path, `Foto_Antes_${codigo}.jpg`);
      updates["foto antes"] = driveFile.webViewLink;
      fs.unlinkSync(fotoAntes.path);
    }

    if (fotoDespues) {
      const driveFile = await uploadFileToDrive(fotoDespues.path, `Foto_Despues_${codigo}.jpg`);
      updates["foto despues"] = driveFile.webViewLink;
      fs.unlinkSync(fotoDespues.path);
    }

    for (const [key, value] of Object.entries(updates)) {
      const colIdx = headers.findIndex((h) => h.trim().toLowerCase() === key.trim().toLowerCase());
      if (colIdx >= 0 && value) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, value);
      }
    }

    console.log(`📸 Fotos subidas para orden ${codigo}`);
    res.json({ ok: true, message: "Fotos subidas correctamente" });
  } catch (e) {
    console.error("❌ Error al subir fotos:", e);
    res.status(500).json({ error: "Error al subir fotos" });
  }
});

/* ======================================================
   🔹 POST: subir firma digital
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
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const colIdx = headers.findIndex((h) => /firma/i.test(h));
    if (colIdx >= 0) {
      const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
      await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, driveFile.webViewLink);
    }

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
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    const colIdx = headers.findIndex((h) => /estado/i.test(h));
    const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
    await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, "Finalizada");

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
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    if (idxCodigo < 0) throw new Error("No existe columna Código");

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    await deleteRow(SHEET_NAME, rowIndex);
    console.log(`🗑️ Orden ${codigo} eliminada correctamente`);

    res.json({ ok: true, message: `Orden ${codigo} eliminada correctamente` });
  } catch (e) {
    console.error("❌ Error al eliminar orden:", e);
    res.status(500).json({ error: "Error al eliminar orden" });
  }
});

export { router };
