import { google } from "googleapis";
import fs from "fs";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID
} from "../config.js";

/**
 * 🧩 Inicializa autenticación con Google Drive
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
 * 📁 Verifica si existe carpeta de orden o la crea
 * @param {string} codigo - Código de la orden
 * @returns {Promise<string>} ID de la carpeta
 */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();

  // Buscar carpeta existente
  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Si no existe, crearla
  const folderMetadata = {
    name: `Orden_${codigo}`,
    mimeType: "application/vnd.google-apps.folder",
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id",
  });

  console.log(`📂 Carpeta creada para la orden ${codigo}: ${folder.data.id}`);
  return folder.data.id;
}

/**
 * ☁️ Sube un archivo PDF a Drive dentro de la carpeta de la orden
 */
export async function uploadPDFToDrive(filePath, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const fileMetadata = {
      name: `Orden_${codigo}.pdf`,
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

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    console.log(`✅ PDF subido: ${data.webViewLink}`);
    return data.webViewLink;
  } catch (error) {
    console.error("❌ Error subiendo PDF a Drive:", error);
    throw new Error("Error al subir PDF a Google Drive");
  }
}

/**
 * 🖼️ Sube una imagen codificada en base64 a Drive
 */
export async function uploadBase64ImageToDrive(base64Data, nombre, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  const buffer = Buffer.from(base64Data, "base64");
  const tempFilePath = `/tmp/${nombre}.jpg`;
  fs.writeFileSync(tempFilePath, buffer);

  const fileMetadata = {
    name: `${nombre}.jpg`,
    parents: [folderId],
  };

  const media = {
    mimeType: "image/jpeg",
    body: fs.createReadStream(tempFilePath),
  };

  const { data } = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  fs.unlinkSync(tempFilePath);
  return data.webViewLink;
}

/**
 * 💾 Sube directamente un archivo en buffer (por multer)
 */
export async function uploadFileBufferToDrive(fileBuffer, fileName, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  const tempFilePath = `/tmp/${fileName}`;
  fs.writeFileSync(tempFilePath, fileBuffer);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(tempFilePath),
  };

  const { data } = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  fs.unlinkSync(tempFilePath);
  return data.webViewLink;
}
