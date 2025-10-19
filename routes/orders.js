// routes/orders.js
import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow, getExcelColumnName } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = process.env.ORDERS_SHEET || "Ordenes";

// Genera código tipo BH-YYYY-###
async function generarCodigo() {
  const rows = await getSheetData(SHEET_NAME);
  const year = new Date().getFullYear();
  let max = 0;
  for (let i = 1; i < rows.length; i++) {
    const code = (rows[i][0] || "").toString();
    const m = code.match(/^BH-(\d{4})-(\d{3})$/);
    if (m && Number(m[1]) === year) {
      const n = Number(m[2]);
      if (n > max) max = n;
    }
  }
  const next = (max + 1).toString().padStart(3, "0");
  return `BH-${year}-${next}`;
}

// ======================================================
// 🔹 LISTAR ÓRDENES
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const o = {};
      headers.forEach((h, j) => (o[h] = r[j] ?? ""));
      o.fila = i + 2;
      return o;
    });
    res.json(data);
  } catch (e) {
    console.error("❌ Error al listar órdenes:", e);
    res.status(500).json({ error: "Error al listar órdenes" });
  }
});

// ======================================================
// 🔹 CREAR ORDEN
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { arrendatario, telefono, tecnico, estado, descripcion } = req.body;
    const codigo = await generarCodigo();
    const fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

    await appendRow(SHEET_NAME, [
      codigo, arrendatario || "", telefono || "", tecnico || "Sin asignar",
      estado || "Pendiente", descripcion || "", fecha
    ]);

    res.json({ ok: true, codigo });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

// ======================================================
// 🔹 ACTUALIZAR ORDEN
// ======================================================
router.post("/update", async (req, res) => {
  try {
    const { fila, cambios } = req.body;
    if (!fila || !cambios || typeof cambios !== "object") {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const rows = await getSheetData(SHEET_NAME);
    const headers = (rows[0] || []).map(h => (h||"").toString().toLowerCase());

    for (const [k, v] of Object.entries(cambios)) {
      const idx = headers.findIndex(h => h === k.toLowerCase());
      if (idx < 0) continue;
      const col = getExcelColumnName(idx);
      const a1 = `${SHEET_NAME}!${col}${fila}`;
      await updateCell(SHEET_NAME, a1, v);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar orden:", e);
    res.status(500).json({ error: "Error al actualizar orden" });
  }
});

// ======================================================
// 🔹 ELIMINAR ORDEN
// ======================================================
router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    if (!fila || fila < 2) return res.status(400).json({ error: "Fila inválida" });
    await deleteRow(SHEET_NAME, fila);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al eliminar orden:", e);
    res.status(500).json({ error: "Error al eliminar orden" });
  }
});

export default router;
