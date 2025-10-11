import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, DRIVE_FOLDER_ID } from "../config.js";

// Inicializar cliente de Google Drive
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  SCOPES
);

const drive = google.drive({ version: "v3", auth });

/**
 * ✅ Verifica o crea una subcarpeta para la orden (por ejemplo BH-2025-001)
 */
export async function ensureOrderFolder(orderCode) {
  try {
    // Buscar si ya existe la carpeta
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and name='${orderCode}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)"
    });

    if (res.data.files.length > 0) {
      return res.data.files[0].id; // Ya existe
    }

    // Crear carpeta si no existe
    const folderMetadata = {
      name: orderCode,
      mimeType: "application/vnd.google-apps.folder",
      parents: [DRIVE_FOLDER_ID]
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: "id"
    });

    return folder.data.id;
  } catch (error) {
    console.error("❌ Error creando/verificando carpeta en Drive:", error);
    throw error;
  }
}

/**
 * ✅ Sube un archivo PDF en base64 a Drive dentro de la carpeta de la orden
 */
export async function uploadPDFToDrive(base64Data, orderCode) {
  try {
    const folderId = await ensureOrderFolder(orderCode);

    const filePath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      `${orderCode}.pdf`
    );

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    const fileMetadata = {
      name: `${orderCode}.pdf`,
      parents: [folderId]
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath)
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink"
    });

    fs.unlinkSync(filePath); // eliminar temporal

    console.log(`✅ PDF subido a Drive: ${file.data.webViewLink}`);
    return file.data.webViewLink;
  } catch (error) {
    console.error("❌ Error subiendo PDF a Drive:", error);
    throw error;
  }
}
