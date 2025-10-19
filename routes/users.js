// routes/users.js
import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = "Usuarios";

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

// ================================================
