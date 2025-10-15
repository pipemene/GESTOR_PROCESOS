import { google } from "googleapis";
import fs from "fs";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  DRIVE_FOLDER_ID
} from "../config.js";

/**
 * Autenticación con Google Drive
 */
function getDriveClient() {
  const auth = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  return google.drive({ version: "v3", auth });
}

/**
 * 🔹 Crea una carpeta para una orden (si no existe)
 */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();

  // Buscar si ya existe carpeta con el nombre del código
  const query = `name='${codigo}' and '${DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: "files(id, name)" });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Crear nueva carpeta
  const folderMetadata = {
    name: codigo,
    mimeType: "application/vnd.google-apps.folder",
    parents: [DRIVE_FOLDER_ID],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id",
  });

  return folder.data.id;
}

/**
 * 🔹 Subir un PDF (usado al finalizar orden o por contabilidad)
 */
export async function uploadPDFToDrive(filePath, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  const fileMetadata = {
    name: `${codigo}.pdf`,
    parents: [folderId],
  };

  const media = {
    mimeType: "application/pdf",
    body: fs.createReadStream(filePath),
  };

  const { data } = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  // Hacer público el archivo
  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return data.webViewLink;
}

/**
 * 🔹 Subir una imagen base64 (fotos o firmas)
 */
export async function uploadBase64ImageToDrive(base64Data, fileName, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  // Decodificar base64
  const buffer = Buffer.from(base64Data.split(",")[1], "base64");

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: "image/jpeg",
    body: Buffer.from(buffer),
  };

  // Subir la imagen a Drive
  const { data } = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  // Hacer público el archivo
  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return data.webViewLink;
}
