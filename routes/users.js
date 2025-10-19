// routes/users.js
import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = process.env.USERS_SHEET || "Usuarios";

function parseToken(req) {
  const token = req.headers["x-user-token"] || req.body?.token;
  if (!token) return null;
  try { return JSON.parse(Buffer.from(token, "base64").toString("utf8")); }
  catch { return null; }
}

// ======================================================
// 🔹 LOGIN — /api/users/login
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
    console.error("❌ Error al iniciar sesión:", e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ======================================================
// 🔹 LISTAR USUARIOS
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] ?? ""));
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
// 🔹 CREAR, ACTUALIZAR Y ELIMINAR USUARIOS
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    const caller = parseToken(req);
    if (!caller || !["superadmin", "admin"].includes((caller.rol||"").toLowerCase())) {
      return res.status(403).json({ error: "No autorizado" });
    }
    await appendRow(SHEET_NAME, [nombre, usuario, contrasena, rol]);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear usuario:", e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

router.post("/update", async (req, res) => {
  try {
    const { fila, cambios } = req.body;
    if (!fila || !cambios) return res.status(400).json({ error: "Datos inválidos" });

    const caller = parseToken(req);
    if (!caller || !["superadmin", "admin"].includes((caller.rol||"").toLowerCase())) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0].map(h => h.toLowerCase());

    for (const [campo, valor] of Object.entries(cambios)) {
      const idx = headers.findIndex(h => h === campo.toLowerCase());
      if (idx < 0) continue;
      const letra = String.fromCharCode(65 + idx);
      const a1 = `${SHEET_NAME}!${letra}${fila}`;
      await updateCell(SHEET_NAME, a1, valor);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    const caller = parseToken(req);
    if (!caller || !["superadmin", "admin"].includes((caller.rol||"").toLowerCase())) {
      return res.status(403).json({ error: "No autorizado" });
    }
    await deleteRow(SHEET_NAME, fila);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al eliminar usuario:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
