import express from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } from "../config.js";

const router = express.Router();

// ==============================
// 🔐 AUTENTICACIÓN GOOGLE SHEETS
// ==============================
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const sheets = google.sheets({ version: "v4", auth });

// ==============================
// 🧠 LOGIN USUARIOS
// ==============================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Usuario y contraseña requeridos" });
    }

    // Leer la hoja "Usuarios"
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Usuarios!A2:C",
    });

    const rows = response.data.values || [];
    const user = rows.find(
      (r) => r[0]?.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      console.log(`⚠️ Usuario no encontrado: ${username}`);
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const [userName, userPassword, userRole] = user;

    if (userPassword.trim() !== password.trim()) {
      console.log(`❌ Contraseña incorrecta para ${username}`);
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Crear token JWT
    const token = jwt.sign(
      { username: userName, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log(`✅ Usuario autenticado: ${username} (${userRole})`);

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      role: userRole,
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Error interno en el login" });
  }
});

export default router;
