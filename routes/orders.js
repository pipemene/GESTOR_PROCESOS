import express from "express";
import { google } from "googleapis";
import fs from "fs";
import nodemailer from "nodemailer";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SHEET_ID,
  DRIVE_FOLDER_ID,
  GMAIL_USER,
  GMAIL_APP_PASSWORD
} from "../config.js";
import { uploadPDFToDrive } from "../services/driveService.js";

const router = express.Router();

// =========================
// CONFIGURAR GOOGLE AUTH
// =========================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheets = google.sheets({ version: "v4", auth });

// =========================
// FUNCIONES AUXILIARES
// =========================

// Genera código automático tipo BH-2025-001
function generarCodigoOrden() {
  const año = new Date().getFullYear();
  const numero = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `BH-${año}-${numero}`;
}

// =========================
// ENDPOINT: OBTENER ÓRDENES
// =========================
router.get("/", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "A2:K",
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
  } catch (err) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", err);
    res.status(500).send("Error al obtener las órdenes");
  }
});

// =========================
// ENDPOINT: CREAR NUEVA ORDEN
// =========================
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    const codigoOrden = generarCodigoOrden();
    const fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "A2",
      valueInputOption: "RAW",
      resource: {
        values: [
          [
            "BLUE HOME INMOBILIARIA",
            fecha,
            arrendatario,
            telefono,
            codigoOrden,
            observacion,
            tecnico,
            "Pendiente",
            "",
            "",
            "",
          ],
        ],
      },
    });

    res.status(200).json({ message: "Orden creada correctamente", codigo: codigoOrden });
  } catch (err) {
    console.error("❌ ERROR AL CREAR ORDEN:", err);
    res.status(500).send("Error al crear la orden");
  }
});

// =========================
// ENDPOINT: ACTUALIZAR ORDEN + SUBIR PDF
// =========================
router.put("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { pdfBase64 } = req.body;

    const pdfPath = `/tmp/${codigo}.pdf`;
    fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, "base64"));

    // Subir PDF al Drive
    const pdfDriveLink = await uploadPDFToDrive(pdfPath, codigo);

    // Enviar correo con el PDF
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Blue Home Inmobiliaria" <${GMAIL_USER}>`,
      to: ["arrendamientos@bluehomeinmo.co", "reparaciones@bluehomeinmo.co"],
      subject: `Orden ${codigo} finalizada - Blue Home Inmobiliaria`,
      html: `
        <p>Estimado equipo,</p>
        <p>Se ha completado la orden <strong>${codigo}</strong>. Adjunto PDF y enlace en Drive:</p>
        <a href="${pdfDriveLink}">Ver documento en Google Drive</a>
        <p>Atentamente,<br>Blue Home Inmobiliaria</p>
      `,
      attachments: [
        {
          filename: `${codigo}.pdf`,
          path: pdfPath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    fs.unlinkSync(pdfPath);

    res.status(200).json({ message: "Orden actualizada y PDF enviado con éxito" });
  } catch (err) {
    console.error("❌ ERROR AL ACTUALIZAR ORDEN:", err);
    res.status(500).send("Error al actualizar la orden o enviar correo");
  }
});

export default router;
