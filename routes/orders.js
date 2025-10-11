import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  SPREADSHEET_ID,
  ORDERS_SHEET,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} from "../config.js";

const router = express.Router();

/* ============================================================
   ✅ CREAR NUEVA ORDEN (no sobrescribe, genera código automático)
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { codigoInmueble, arrendatario, telefono, tecnico, observacion } = req.body;

    if (!arrendatario || !telefono) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Conectar con Google Sheets
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) return res.status(500).json({ error: "Hoja no encontrada" });

    // Obtener número consecutivo
    const rows = await sheet.getRows();
    const consecutivo = rows.length + 1;
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const año = fecha.getFullYear();
    const codigoGenerado = `BH-${año}-${String(consecutivo).padStart(3, "0")}`;

    // Crear nueva fila
    await sheet.addRow({
      Cliente: "BLUE HOME INMOBILIARIA",
      Fecha: fechaTexto,
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: codigoGenerado,
      Descripcion: observacion || "",
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente",
      FotoAntes: "",
      FotoDespues: "",
      Firma: "",
      NombreFirmante: "",
    });

    console.log("✅ Nueva orden creada:", codigoGenerado);
    res.json({ message: "Orden creada correctamente", codigo: codigoGenerado });
  } catch (error) {
    console.error("🔥 Error al crear la orden:", error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

/* ============================================================
   ✅ OBTENER TODAS LAS ÓRDENES
============================================================ */
router.get("/", async (req, res) => {
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) return res.status(500).json({ error: "Hoja no encontrada" });

    const rows = await sheet.getRows();
    const data = rows.map((row) => ({
      codigo: row["Código"] || "",
      arrendatario: row["Inquilino"] || "",
      telefono: row["Telefono"] || "",
      tecnico: row["Tecnico"] || "",
      observacion: row["Descripcion"] || "",
      estado: row["Estado"] || "",
      fecha: row["Fecha"] || "",
      fotoAntes: row["FotoAntes"] || "",
      fotoDespues: row["FotoDespues"] || "",
      firma: row["Firma"] || "",
      nombreFirmante: row["NombreFirmante"] || "",
    }));

    res.json(data);
  } catch (error) {
    console.error("🔥 Error al obtener órdenes:", error);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

/* ============================================================
   ✅ ACTUALIZAR UNA ORDEN POR CÓDIGO
============================================================ */
router.put("/:codigo", async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const {
      tecnico,
      estado,
      observacion,
      fotoAntesBase64,
      fotoDespuesBase64,
      firmaBase64,
      firmaNombre,
    } = req.body;

    console.log("🛠️ Actualizando orden:", codigo);

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) return res.status(500).json({ error: "Hoja no encontrada" });

    const rows = await sheet.getRows();
    const row = rows.find(
      (r) => String(r["Código"]).trim() === String(codigo).trim()
    );

    if (!row) {
      console.error("❌ No se encontró la orden con ese código:", codigo);
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    // Actualizar campos
    if (tecnico) row["Tecnico"] = tecnico;
    if (estado) row["Estado"] = estado;
    if (observacion) row["Descripcion"] = observacion;

    // Fotos y firma
    if (fotoAntesBase64) row["FotoAntes"] = fotoAntesBase64;
    if (fotoDespuesBase64) row["FotoDespues"] = fotoDespuesBase64;
    if (firmaBase64) row["Firma"] = firmaBase64;
    if (firmaNombre) row["NombreFirmante"] = firmaNombre;

    await row.save();
    console.log("✅ Orden actualizada correctamente");

    res.json({ message: "Orden actualizada correctamente en la hoja" });
  } catch (error) {
    console.error("🔥 Error al actualizar la orden:", error);
    res.status(500).json({ error: "Error al actualizar la orden" });
  }
});
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { ensureOrderFolder, uploadPDFtoDrive } from "../services/driveService.js";
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 📄 PUT /api/orders/:codigo
// Guarda el PDF, lo sube a Drive y envía el correo
router.put("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { pdfBase64 } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "No se recibió el PDF." });
    }

    // 🔹 Guardar el PDF temporalmente
    const pdfPath = path.join(__dirname, `../tmp/${codigo}.pdf`);
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(pdfPath, pdfBuffer);

    // 🔹 Crear carpeta de la orden (si no existe)
    const rootFolderId = process.env.DRIVE_FOLDER_ID;
    const folderId = await ensureOrderFolder(rootFolderId, codigo);

    // 🔹 Subir PDF a Drive
    const pdfUrl = await uploadPDFtoDrive(folderId, pdfPath, `${codigo}.pdf`);

    // 🔹 Configurar envío de correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "bluehomeinmobiliaria@gmail.com", // correo emisor
        pass: process.env.GMAIL_APP_PASSWORD, // clave de aplicación (no tu contraseña normal)
      },
    });

    // 🔹 Enviar correo
    await transporter.sendMail({
      from: '"Gestor Blue Home" <bluehomeinmobiliaria@gmail.com>',
      to: ["arrendamientos@bluehomeinmo.co", "reparaciones@bluehomeinmo.co"],
      subject: `Orden ${codigo} completada y firmada`,
      html: `
        <h3>📄 Orden ${codigo} completada</h3>
        <p>Se adjunta el PDF firmado y subido al Drive.</p>
        <p><a href="${pdfUrl}">Ver PDF en Google Drive</a></p>
      `,
    });

    // 🔹 Eliminar PDF temporal
    fs.unlinkSync(pdfPath);

    res.json({
      success: true,
      message: "PDF subido y correo enviado correctamente",
      pdfUrl,
    });
  } catch (error) {
    console.error("❌ Error al procesar PDF:", error);
    res.status(500).json({ error: "Error al subir o enviar PDF." });
  }
});

export default router;
