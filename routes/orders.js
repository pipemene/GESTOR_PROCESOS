// routes/orders.js
import express from "express";
import {
  getSheetData,
  appendRow,
  updateCell,
  deleteRow
} from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = "ordenes"; // ✅ Nombre exacto de la hoja en Google Sheets

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
      headers.forEach((h, i) => (obj[h.trim().toLowerCase()] = r[i] || ""));
      return obj;
    });

    res.json(data);
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
