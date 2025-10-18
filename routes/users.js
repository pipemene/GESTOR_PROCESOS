import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = "Usuarios";

// ======================================================
// 🔹 GET: listar usuarios
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2; // para saber en qué fila está (1 = encabezado)
      return obj;
    });

    res.json(data);
  } catch (e) {
    console.error("❌ Error al obtener usuarios:", e);
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

// ======================================================
// 🔹 POST: crear usuario nuevo
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    if (!nombre || !usuario || !contrasena || !rol) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    await appendRow(SHEET_NAME, [nombre, usuario, contrasena, rol]);
    console.log(`✅ Usuario ${usuario} creado correctamente`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear usuario:", e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ======================================================
// 🔹 POST: actualizar usuario (por fila)
// ======================================================
router.post("/update", async (req, res) => {
  try {
    const { fila, nombre, usuario, contrasena, rol } = req.body;
    if (!fila) return res.status(400).json({ error: "Fila requerida" });

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const campos = { nombre, usuario, contrasena, rol };

    for (const [key, value] of Object.entries(campos)) {
      if (!value) continue;
      const colIdx = headers.findIndex(h => h.toLowerCase() === key.toLowerCase());
      if (colIdx >= 0) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${fila}`, value);
      }
    }

    console.log(`✏️ Usuario actualizado (fila ${fila})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ======================================================
// 🔹 DELETE: eliminar usuario por número de fila
// ======================================================
router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    if (!fila || fila < 2) return res.status(400).json({ error: "Fila inválida" });

    await deleteRow(SHEET_NAME, fila);
    console.log(`🗑️ Usuario eliminado (fila ${fila})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al eliminar usuario:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
