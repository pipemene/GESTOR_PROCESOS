
// ======================================================
// 📄 routes/users.js
// Blue Home Gestor — Módulo de Usuarios
// ======================================================

import express from "express";
import {
  getSheetData,
  appendRow,
  updateCell,
  deleteRow,
  getExcelColumnName,
} from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = "Usuarios";

// ======================================================
// 🔹 GET: Listar todos los usuarios
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
    console.error("❌ Error al obtener usuarios:", err.message);
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

// ======================================================
// 🔹 POST: Crear nuevo usuario
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;

    if (!nombre || !usuario || !contrasena || !rol) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // ✅ Evita duplicados
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxUsuario = headers.findIndex((h) => /usuario/i.test(h));
    const existe = rows.some(
      (r, i) =>
        i > 0 &&
        (r[idxUsuario] || "").trim().toLowerCase() === usuario.trim().toLowerCase()
    );

    if (existe) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    await appendRow(SHEET_NAME, [nombre, usuario, contrasena, rol]);
    console.log(`✅ Usuario ${usuario} creado correctamente`);
    res.json({ ok: true, message: `Usuario ${usuario} creado correctamente` });
  } catch (err) {
    console.error("❌ Error al crear usuario:", err.message);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ======================================================
// 🔹 PATCH: Editar usuario existente
// ======================================================
router.patch("/:usuario", async (req, res) => {
  try {
    const { usuario } = req.params;
    const { nombre, contrasena, rol } = req.body;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idxUsuario = headers.findIndex((h) => /usuario/i.test(h));

    if (idxUsuario < 0) {
      return res.status(400).json({ error: "No existe columna usuario" });
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxUsuario] || "").trim().toLowerCase() === usuario.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const campos = { nombre, contrasena, rol };
    for (const [key, value] of Object.entries(campos)) {
      if (!value) continue;
      const colIdx = headers.findIndex((h) => h === key.toLowerCase());
      if (colIdx >= 0) {
        const colLetter = getExcelColumnName(colIdx);
        const celda = `${SHEET_NAME}!${colLetter}${rowIndex}`;
        await updateCell(SHEET_NAME, celda, value);
      }
    }

    console.log(`✏️ Usuario ${usuario} actualizado correctamente`);
    res.json({ ok: true, message: `Usuario ${usuario} actualizado correctamente` });
  } catch (err) {
    console.error("❌ Error al editar usuario:", err.message);
    res.status(500).json({ error: "Error al editar usuario" });
  }
});

// ======================================================
// 🔹 DELETE: Eliminar usuario
// ======================================================
router.delete("/:usuario", async (req, res) => {
  try {
    const { usuario } = req.params;

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idxUsuario = headers.findIndex((h) => /usuario/i.test(h));

    if (idxUsuario < 0) {
      return res.status(400).json({ error: "No existe columna usuario" });
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxUsuario] || "").trim().toLowerCase() === usuario.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await deleteRow(SHEET_NAME, rowIndex);
    console.log(`🗑️ Usuario ${usuario} eliminado correctamente`);
    res.json({ ok: true, message: `Usuario ${usuario} eliminado correctamente` });
  } catch (err) {
    console.error("❌ Error al eliminar usuario:", err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
