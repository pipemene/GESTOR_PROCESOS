import express from "express";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import {
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID,
  GMAIL_USER,
  GMAIL_APP_PASSWORD
} from "../config.js";

const router = express.Router();

// Autenticación con Google Sheets
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
);

const sheets = google.sheets({ version: "v4", auth });

// ============================
// 📍 Obtener todas las órdenes
// ============================
router.get("/", async (req, res) => {
  console.log("Solicitando todas las órdenes...");
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Órdenes!A:H", // <- Aquí se lee desde la hoja Órdenes
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const data = rows.slice(1).map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", error);
    res.status(500).json({ success: false, message: "Error al obtener órdenes", error });
  }
});

// ============================
// 📍 Crear nueva orden
// ============================
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    if (!codigo || !arrendatario) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    // Generar código único tipo BH-2025-XXX
    const random = Math.floor(Math.random() * 1000);
    const codigoGenerado = `BH-2025-${random}`;

    // Crear fila con todos los valores
    const values = [
      "BLUE HOME INMOBILIARIA",
      new Date().toLocaleString("es-CO"),
      arrendatario,
      telefono,
      codigoGenerado,
      observacion,
      tecnico || "Sin asignar",
      "Pendiente",
    ];

    // Insertar fila en la hoja “Órdenes”
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Órdenes!A:H",
      valueInputOption: "USER_ENTERED",
      resource: { values: [values] },
    });

    console.log("✅ Orden creada:", codigoGenerado);

    res.json({ success: true, message: "Orden creada correctamente", codigo: codigoGenerado });
  } catch (error) {
    console.error("❌ ERROR AL CREAR ORDEN:", error);
    res.status(500).json({ success: false, message: "Error al crear la orden", error });
  }
});

// ============================
// 📍 Actualizar orden (guardar PDF firmado)
// ============================
router.put("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, message: "Falta el archivo PDF." });
    }

    console.log(`📄 Recibido PDF firmado para orden ${codigo}`);

    // Enviar por correo (opcional)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const mailOptions = {
      from: `"Gestor de Reparaciones" <${GMAIL_USER}>`,
      to: ["arrendamientos@bluehomeinmo.co", "reparaciones@bluehomeinmo.co"],
      subject: `PDF de orden ${codigo}`,
      text: `Se ha recibido el PDF firmado correspondiente a la orden ${codigo}.`,
      attachments: [
        {
          filename: `Orden_${codigo}.pdf`,
          content: pdfBase64.split(";base64,").pop(),
          encoding: "base64",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "PDF guardado y correo enviado" });
  } catch (error) {
    console.error("❌ ERROR AL ACTUALIZAR ORDEN:", error);
    res.status(500).json({ success: false, message: "Error al actualizar orden", error });
  }
});

export default router;
