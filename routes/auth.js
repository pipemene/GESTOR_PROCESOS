import express from "express";
import { google } from "googleapis";
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } from "../config.js";

const router = express.Router();

// ==============================
// 🔐 Autenticación con Google Sheets
// ==============================
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets.readonly"]
);

const sheets = google.sheets({ version: "v4", auth });

// ==============================
// 🧠 LOGIN USUARIOS
// ==============================
router.post("/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ message: "Usuario y contraseña requeridos" });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Usuarios!A2:D", // ✅ A-D (nombre, usuario, contraseña, rol)
    });

    const rows = response.data.values || [];
    const user = rows.find(
      (r) => r[1]?.trim().toLowerCase() === usuario.trim().toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const [nombre, username, password, rol] = user;

    if (password.trim() !== contrasena.trim()) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // 🔑 Generar token Base64 (no JWT, para tu middleware actual)
    const tokenData = { nombre, usuario: username, rol };
    const token = Buffer.from(JSON.stringify(tokenData)).toString("base64");

    res.json({
      ok: true,
      message: "Inicio de sesión exitoso",
      token,
      rol,
      nombre,
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Error interno en el login" });
  }
});

export default router;
