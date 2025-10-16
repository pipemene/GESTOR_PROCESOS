import { google } from "googleapis";
import fs from "fs";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID
} from "../config.js";

/**
 * 🧩 Autenticación con Google Drive (modo Shared Drive)
 */
function getDriveClient() {
  const auth = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );

  // ✅ Cliente Drive con soporte para unidades compartidas
  return google.drive({
    version: "v3",
    auth,
    params: { supportsAllDrives: true, includeItemsFromAllDrives: true },
  });
}

/**
 * 📁 Crea o recupera la carpeta de una orden dentro de la unidad compartida
 */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();

  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Crear carpeta si no existe
  const folderMetadata = {
    name: `Orden_${codigo}`,
    mimeType: "application/vnd.google-apps.folder",
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id",
    supportsAllDrives: true,
  });

  console.log(`📂 Carpeta creada para la orden ${codigo}: ${folder.data.id}`);
  return folder.data.id;
}

/**
 * ☁️ Sube un archivo PDF a Drive y devuelve enlaces de vista y descarga
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
      supportsAllDrives: true,
    });

    // Permisos públicos
    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    const viewLink = data.webViewLink;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;

    console.log(`✅ PDF subido: ${viewLink}`);
    console.log(`⬇ Enlace de descarga directa: ${downloadLink}`);

    return { viewLink, downloadLink };
  } catch (error) {
    console.error("❌ Error subiendo PDF a Drive:", error);
    throw new Error("Error al subir PDF a Google Drive");
  }
}

/**
 * 🖼️ Sube una imagen base64 (firma o evidencia) a Drive
 */
export async function uploadBase64ImageToDrive({ dataUrl, filename, folderId }) {
  try {
    const drive = getDriveClient();
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const tempFilePath = `/tmp/${filename}`;
    fs.writeFileSync(tempFilePath, buffer);

    const fileMetadata = { name: filename, parents: [folderId] };
    const media = { mimeType: "image/png", body: fs.createReadStream(tempFilePath) };

    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    fs.unlinkSync(tempFilePath);
    return data.webViewLink;
  } catch (error) {
    console.error("❌ Error al subir imagen base64 a Drive:", error);
    throw new Error("Error al subir imagen");
  }
}

/**
 * 💾 Sube un archivo en buffer (por multer) a Drive
 */
export async function uploadFileBufferToDrive({ buffer, mimeType, filename, folderId }) {
  try {
    const drive = getDriveClient();
    const tempFilePath = `/tmp/${filename}`;
    fs.writeFileSync(tempFilePath, buffer);

    const fileMetadata = {
      name: filename,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType || "application/octet-stream",
      body: fs.createReadStream(tempFilePath),
    };

    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    fs.unlinkSync(tempFilePath);
    return data.webViewLink;
  } catch (error) {
    console.error("❌ Error al subir archivo a Drive:", error);
    throw new Error("Error al subir archivo a Google Drive");
  }
}
