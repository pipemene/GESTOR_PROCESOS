import express from "express";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureOrderFolder, uploadPDFToDrive } from "../services/driveService.js";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SPREADSHEET_ID,
  ORDERS_SHEET,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  DRIVE_FOLDER_ID
} from "../config.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 🔹 Autenticación con Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ----------------------------------------------------------
// 🔸 OBTENER TODAS LAS ÓRDENES
// ----------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    console.log("📋 Solicitando todas las órdenes...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ORDERS_SHEET}!A2:K`,
    });

    const rows = response.data.values || [];
    const orders = rows.map((r) => ({
      cliente: r[0],
      fecha: r[1],
      inquilino: r[2],
      telefono: r[3],
      codigo: r[4],
      descripcion: r[5],
      tecnico: r[6],
      estado: r[7],
      observaciones: r[8],
      fotos: r[9],
      firma: r[10],
    }));

    res.json(orders);
  } catch (error) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", error);
    res.status(500).json({ error: "Error al obtener las órdenes" });
  }
});

// ----------------------------------------------------------
// 🔸 CREAR UNA NUEVA ORDEN
// ----------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;
    console.log("🆕 Datos recibidos para crear orden:", req.body);

    const fechaActual = new Date();
    const fechaFormato = fechaActual.toLocaleString("es-CO");
    const nuevoCodigo = `BH-${fechaActual.getFullYear()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const values = [
      ["BLUE HOME INMOBILIARIA", fechaFormato, arrendatario, telefono, nuevoCodigo, observacion, tecnico, "Pendiente", "", "", ""],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${ORDERS_SHEET}!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    res.json({ success: true, codigo: nuevoCodigo });
  } catch (error) {
    console.error("❌ ERROR AL CREAR ORDEN:", error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// ----------------------------------------------------------
// 🔸 ACTUALIZAR ORDEN + GUARDAR PDF EN DRIVE + ENVIAR EMAIL
// ----------------------------------------------------------
router.put("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { pdfBase64, tecnico, observaciones } = req.body;

    console.log(`✏️ Actualizando orden ${codigo}...`);

    // Guardar PDF temporalmente
    const pdfPath = path.join(__dirname, `${codigo}.pdf`);
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Subir a Drive
    const pdfUrl = await uploadPDFToDrive(pdfPath, `${codigo}.pdf`);

    // Enviar correo con Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Gestor Blue Home Inmobiliaria" <${GMAIL_USER}>`,
      to: ["arrendamientos@bluehomeinmo.co", "reparaciones@bluehomeinmo.co"],
      subject: `Orden ${codigo} completada y firmada`,
      html: `
        <h2>📄 Orden ${codigo} completada</h2>
        <p><b>Técnico:</b> ${tecnico}</p>
        <p><b>Observaciones:</b> ${observaciones}</p>
        <p>Se adjunta el PDF firmado y subido a Drive.</p>
        <a href="${pdfUrl}" style="color:blue;">Ver PDF en Google Drive</a>
      `,
      attachments: [
        {
          filename: `${codigo}.pdf`,
          path: pdfPath,
        },
      ],
    });

    // Eliminar el archivo temporal
    fs.unlinkSync(pdfPath);

    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error("❌ ERROR AL ACTUALIZAR ORDEN:", error);
    res.status(500).json({ error: "Error al actualizar la orden" });
  }
});

export default router;
