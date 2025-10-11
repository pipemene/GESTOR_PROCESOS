import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import fs from "fs";
import nodemailer from "nodemailer";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SHEET_ID,
  DRIVE_FOLDER_ID,
  GMAIL_APP_PASSWORD,
  GMAIL_APP_USER
} from "../config.js";
import { uploadPDFToDrive } from "../services/driveService.js";

const router = express.Router();

// --- Conexión con Google Sheets ---
const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheet() {
  const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc.sheetsByTitle["ordenes"];
}

// --- Generar código incremental ---
async function generarCodigo(sheet) {
  const rows = await sheet.getRows();
  const ultimo = rows.length > 0 ? rows[rows.length - 1].get("Código") : null;
  let numero = 1;
  if (ultimo && ultimo.startsWith("BH-2025-")) {
    numero = parseInt(ultimo.split("-")[2]) + 1;
  }
  return `BH-2025-${numero}`;
}

// --- Crear nueva orden ---
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    if (!codigo || !arrendatario || !telefono || !observacion) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }

    const sheet = await getSheet();
    const nuevoCodigo = await generarCodigo(sheet);

    await sheet.addRow({
      cliente: "BLUE HOME INMOBILIARIA",
      Fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: nuevoCodigo,
      Descripcion: observacion,
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente"
    });

    res.status(200).json({
      success: true,
      message: "Orden creada correctamente",
      codigo: nuevoCodigo
    });
  } catch (error) {
    console.error("❌ Error al crear orden:", error);
    res.status(500).json({ success: false, message: "Error al crear la orden" });
  }
});

// --- Obtener todas las órdenes ---
router.get("/", async (req, res) => {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();

    const ordenes = rows.map((r) => ({
      codigo: r.get("Código"),
      arrendatario: r.get("Inquilino"),
      telefono: r.get("Telefono"),
      tecnico: r.get("Tecnico"),
      estado: r.get("Estado"),
      observacion: r.get("Descripcion"),
    }));

    res.json(ordenes);
  } catch (error) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", error);
    res.status(500).json({ success: false, message: "Error al obtener órdenes" });
  }
});

// --- Actualizar una orden y subir PDF a Drive ---
router.put("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { pdfBase64 } = req.body;

    if (!codigo || !pdfBase64) {
      return res.status(400).json({ success: false, message: "Faltan datos" });
    }

    // Guardar temporalmente el PDF
    const pdfPath = `./temp/${codigo}.pdf`;
    fs.mkdirSync("./temp", { recursive: true });
    fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, "base64"));

    // Subir a Drive
    const driveFileUrl = await uploadPDFToDrive(pdfPath, codigo);

    // Actualizar estado en la hoja
    const sheet = await getSheet();
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get("Código") === codigo);
    if (row) {
      row.set("Estado", "Finalizada");
      row.set("Observaciones", "PDF subido y firmado");
      await row.save();
    }

    // Enviar correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_APP_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Gestor Blue Home" <${GMAIL_APP_USER}>`,
      to: ["arrendamientos@bluehomeinmo.co", "reparaciones@bluehomeinmo.co"],
      subject: `Orden ${codigo} finalizada`,
      html: `
        <h3>Orden ${codigo} finalizada</h3>
        <p>El técnico completó la reparación. Se generó el PDF con firma del inquilino.</p>
        <p><a href="${driveFileUrl}">📄 Ver archivo en Google Drive</a></p>
      `,
    });

    fs.unlinkSync(pdfPath); // Limpieza del archivo local

    res.status(200).json({
      success: true,
      message: "Orden actualizada y PDF enviado correctamente",
      driveFileUrl
    });
  } catch (error) {
    console.error("❌ Error al actualizar orden:", error);
    res.status(500).json({ success: false, message: "Error al actualizar orden" });
  }
});

export default router;
