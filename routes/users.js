// routes/users.js
import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = process.env.USERS_SHEET || "Usuarios";

// ======================================================
// 🔹 LOGIN — acceso público (sin token)
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxUser = headers.findIndex(h => /usuario/i.test(h));
    const idxPass = headers.findIndex(h => /contraseñ|contrasena/i.test(h));
    const idxRol = headers.findIndex(h => /rol/i.test(h));
    const idxNombre = headers.findIndex(h => /nombre/i.test(h));

    let encontrado = null;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (
        row[idxUser]?.trim().toLowerCase() === usuario.trim().toLowerCase() &&
        row[idxPass]?.trim() === contrasena.trim()
      ) {
        encontrado = {
          nombre: row[idxNombre] || "",
          usuario: row[idxUser],
          rol: row[idxRol] || "usuario"
        };
        break;
      }
    }

    if (!encontrado) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Token básico (base64)
    const token = Buffer.from(JSON.stringify(encontrado)).toString("base64");
    res.json({ ok: true, token, user: encontrado });
  } catch (e) {
    console.error("❌ Error al iniciar sesión:", e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ======================================================
// 🔹 LISTAR USUARIOS (solo admin o superadmin)
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2;
      return obj;
    });

    res.json(data);
  } catch (e) {
    console.error("❌ Error al obtener usuarios:", e);
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

// ======================================================
// 🔹 CREAR NUEVO USUARIO (solo superadmin)
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol, token } = req.body;

    const user = token ? JSON.parse(Buffer.from(token, "base64").toString("utf8")) : null;
    if (!user || user.rol.toLowerCase() !== "superadmin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!nombre || !usuario || !contrasena || !rol) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    console.log(`📝 Agregando usuario: ${usuario} (${rol})`);

    await appendRow(SHEET_NAME, [nombre, usuario, contrasena, rol]);

    console.log(`✅ Usuario ${usuario} agregado correctamente`);
    res.json({ ok: true, message: "Usuario agregado correctamente" });

  } catch (e) {
    console.error("❌ Error al crear usuario:", e.message || e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ======================================================
// 🔹 ACTUALIZAR USUARIO POR FILA (solo superadmin)
// ======================================================
router.post("/update", async (req, res) => {
  try {
    const { fila, nombre, usuario, contrasena, rol, token } = req.body;

    const user = token ? JSON.parse(Buffer.from(token, "base64").toString("utf8")) : null;
    if (!user || user.rol.toLowerCase() !== "superadmin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!fila || isNaN(fila)) {
      return res.status(400).json({ error: "Fila inválida" });
    }

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.toLowerCase());
    const campos = { nombre, usuario, contrasena, rol };

    for (const [key, value] of Object.entries(campos)) {
      if (value === undefined || value === null || value === "") continue;

      const colIdx = headers.findIndex(h =>
        key === "contrasena"
          ? /contraseñ|contrasena/.test(h)
          : h === key
      );

      if (colIdx >= 0) {
        const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
        const celda = `${SHEET_NAME}!${letra}${fila}`;
        try {
          await updateCell(SHEET_NAME, celda, value);
        } catch (err) {
          console.error(`⚠️ Error al actualizar celda ${celda}:`, err.message);
        }
      }
    }

    console.log(`✏️ Usuario actualizado correctamente (fila ${fila})`);
    res.json({ ok: true, message: "Usuario actualizado correctamente" });

  } catch (e) {
    console.error("❌ Error al actualizar usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ======================================================
// 🔹 ELIMINAR USUARIO POR FILA (solo superadmin)
// ======================================================
router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    const token = req.headers["x-user-token"];

    const user = token ? JSON.parse(Buffer.from(token, "base64").toString("utf8")) : null;
    if (!user || user.rol.toLowerCase() !== "superadmin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!fila || fila < 2) return res.status(400).json({ error: "Fila inválida" });

    await deleteRow(SHEET_NAME, fila);
    console.log(`🗑️ Usuario eliminado (fila ${fila})`);
    res.json({ ok: true });

  } catch (e) {
    console.error("❌ Error al eliminar usuario:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// ======================================================
// 🔹 Exportar router
// ======================================================
export default router;
