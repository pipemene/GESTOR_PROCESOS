import express from "express";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import {
  GOOGLE_SHEET_ID,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
} from "../config.js";

const router = express.Router();

// ==============================
// 🔐 AUTENTICACIÓN GOOGLE
// ==============================
const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
);

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// ==============================
// ✉️ CONFIGURACIÓN DE CORREO
// ==============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// ==============================
// 📋 OBTENER TODAS LAS ÓRDENES
// ==============================
router.get("/", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Órdenes!A2:H",
    });

    const rows = response.data.values || [];
    const orders = rows.map((row) => ({
      fecha: row[0] || "",
      arrendatario: row[1] || "",
      telefono: row[2] || "",
      codigo: row[3] || "",
      descripcion: row[4] || "",
      tecnico: row[5] || "",
      estado: row[6] || "",
    }));

    res.json(orders);
  } catch (error) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", error);
    res.status(500).json({ message: "Error al obtener órdenes" });
  }
});

// ==============================
// 🧾 CREAR NUEVA ORDEN
// ==============================
router.post("/", async (req, res) => {
  try {
    const { arrendatario, telefono, codigoInmueble, descripcion, tecnico } = req.body;

    // Validación básica
    if (!arrendatario || !telefono || !codigoInmueble) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
    const codigo = `BH-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
    const estado = "Pendiente";

    // Guardar en la hoja Órdenes
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Órdenes!A2:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            `BLUE HOME INMOBILIARIA ${fecha}`,
            arrendatario,
            telefono,
            codigo,
            descripcion,
            tecnico || "Sin asignar",
            estado,
          ],
        ],
      },
    });

    console.log(`✅ Orden ${codigo} registrada correctamente.`);

    // ==============================
    // ☁️ Subir archivo PDF al Drive (si viene adjunto)
    // ==============================
    if (req.files && req.files.archivo) {
      const file = req.files.archivo;
      const fileMetadata = {
        name: `Orden_${codigo}.pdf`,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      };

      const media = {
        mimeType: file.mimetype,
        body: file.data,
      };

      await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id",
      });

      console.log(`📁 Archivo PDF de la orden ${codigo} subido a Drive correctamente.`);
    }

    // ==============================
    // 📩 Enviar correo automático
    // ==============================
    const mailOptions = {
      from: `"Blue Home Inmobiliaria" <${GMAIL_USER}>`,
      to: GMAIL_USER, // aquí puedes cambiar a un correo del área operativa si prefieres
      subject: `Nueva orden registrada: ${codigo}`,
      text: `Se ha registrado una nueva orden en el Gestor de Reparaciones.\n\nCódigo: ${codigo}\nArrendatario: ${arrendatario}\nTeléfono: ${telefono}\nDescripción: ${descripcion}\nTécnico: ${tecnico || "Sin asignar"}\nEstado: ${estado}`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo de confirmación enviado para la orden ${codigo}.`);

    res.json({ message: "Orden creada correctamente" });
  } catch (error) {
    console.error("❌ ERROR AL CREAR ORDEN:", error);
    res.status(500).json({ message: "Error al crear la orden" });
  }
});

export default router;
