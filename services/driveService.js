// services/driveService.js
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const KEYFILE_PATH = "./bluehome-key.json";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

/**
 * 🔹 Sube un archivo al Drive de Blue Home Gestor
 * @param {Object} file — archivo de multer (req.file)
 * @param {String} folderId — ID de carpeta destino
 * @returns {Object} { id, link }
 */
export async function uploadFileToDrive(file, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
  try {
    if (!file || !file.path) {
      throw new Error("Archivo no encontrado en la solicitud");
    }

    const fileMetadata = {
      name: file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype || "application/octet-stream",
      body: fs.createReadStream(file.path), // ✅ Esto garantiza que sea un stream válido
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    // Limpieza del archivo temporal
    fs.unlinkSync(file.path);

    console.log("✅ Archivo subido correctamente:", response.data.webViewLink);
    return {
      id: response.data.id,
      link: response.data.webViewLink,
    };
  } catch (error) {
    console.error("❌ Error al subir archivo a Google Drive:", error);
    throw error;
  }
}
