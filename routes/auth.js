// routes/auth.js
import express from "express";
import { getSheetData } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = process.env.USERS_SHEET || "Usuarios";

// ======================================================
// 🔹 LOGIN — /api/auth/login
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0] || [];
    const idxUser = headers.findIndex(h => /usuario/i.test(h));
    const idxPass = headers.findIndex(h => /contraseñ|contrasena/i.test(h));
    const idxRol  = headers.findIndex(h => /rol/i.test(h));
    const idxNom  = headers.findIndex(h => /nombre/i.test(h));

    let found = null;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (
        r[idxUser]?.toString().trim().toLowerCase() === usuario.trim().toLowerCase() &&
        r[idxPass]?.toString().trim() === contrasena.trim()
      ) {
        found = {
          nombre: r[idxNom] || "",
          usuario: r[idxUser],
          rol: r[idxRol] || "usuario",
        };
        break;
      }
    }

    if (!found) return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = Buffer.from(JSON.stringify(found)).toString("base64");
    res.json({ ok: true, token, user: found });
  } catch (e) {
    console.error("❌ Error en /auth/login:", e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

export default router;
