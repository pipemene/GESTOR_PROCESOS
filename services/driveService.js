// services/driveService.js
import fs from "fs";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// ======================================================
// 🔹 Autenticación Google Drive
// ======================================================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/\r?\n/g, "\n")
      : undefined,
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

/**
 * ======================================================
 * 🔹 Subir archivo a Google Drive (fotos, firmas, etc.)
 * ======================================================
 * @param {string|object} file — ruta temporal o archivo de multer
 * @param {string} nombre — nombre que tendrá en Drive
 * @param {string} folderId — carpeta destino (por defecto la global)
 * @returns {object} { id, webViewLink }
 */
export async function uploadFileToDrive(file, nombre, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
  try {
    const filePath = typeof file === "string" ? file : file?.path;
    if (!filePath) throw new Error("No se encontró archivo o ruta válida.");

    const fileMetadata = { name: nombre || (file.originalname ?? "archivo_sin_nombre"), parents: [folderId] };
    const media = { body: fs.createReadStream(filePath) };

    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    console.log(`✅ Archivo subido a Drive: ${res.data.webViewLink}`);
    return { id: res.data.id, webViewLink: res.data.webViewLink };
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive:", err.message);
    throw err;
  }
}
