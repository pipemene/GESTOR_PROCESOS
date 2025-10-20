import express from "express";
import { getSheetData, appendRow, updateCell, deleteRow } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = process.env.USERS_SHEET || "Usuarios";

// ======================================================
// 🔹 LOGIN
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

    const userRow = rows.find((r, i) => 
      i > 0 &&
      r[idxUser]?.trim().toLowerCase() === usuario.trim().toLowerCase() &&
      r[idxPass]?.trim() === contrasena.trim()
    );

    if (!userRow) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const encontrado = {
      nombre: userRow[idxNombre] || "",
      usuario: userRow[idxUser],
      rol: userRow[idxRol] || "usuario"
    };

    const token = Buffer.from(JSON.stringify(encontrado)).toString("base64");
    res.json({ ok: true, token, user: encontrado });
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error);
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
    const usuarios = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2;
      return obj;
    });

    res.json(usuarios);
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

// ======================================================
// 🔹 CREAR USUARIO (solo superadmin)
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

    await appendRow(SHEET_NAME, [nombre, usuario, contrasena, rol]);
    res.json({ ok: true, message: "Usuario creado correctamente" });
  } catch (error) {
    console.error("❌ Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ======================================================
// 🔹 ACTUALIZAR USUARIO (solo superadmin)
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

    const columnas = [nombre, usuario, contrasena, rol];
    for (let i = 0; i < columnas.length; i++) {
      if (columnas[i]) {
        await updateCell(SHEET_NAME, fila, i + 1, columnas[i]);
      }
    }

    res.json({ ok: true, message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ======================================================
// 🔹 ELIMINAR USUARIO (solo superadmin)
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
    res.json({ ok: true, message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
