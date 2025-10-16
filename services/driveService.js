import { google } from "googleapis";
import fs from "fs";
import path from "path";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID
} from "../config.js";

/**
 * 🧩 Inicializa autenticación con Google Drive (Service Account)
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
 * 📁 Verifica o crea carpeta de orden dentro de la unidad compartida
 */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();

  // Buscar carpeta existente
  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (res.data.files.length > 0) {
    console.log(`📁 Carpeta existente para Orden_${codigo}`);
    return res.data.files[0].id;
  }

  // Crear nueva carpeta
  const fileMetadata = {
    name: `Orden_${codigo}`,
    mimeType: "application/vnd.google-apps.folder",
    parents: [GOOGLE_DRIVE_FOLDER_ID]
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
    supportsAllDrives: true
  });

  console.log(`📂 Carpeta creada para la orden Orden_${codigo}: ${folder.data.id}`);
  return folder.data.id;
}

/**
 * ☁️ Sube archivo PDF y devuelve link de vista y descarga
 */
export async function uploadPDFToDrive(filePath, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const fileMetadata = {
      name: `Orden_${codigo}.pdf`,
      parents: [folderId]
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath)
    };

    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true
    });

    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;
    console.log(`✅ PDF subido: ${data.webViewLink}`);
    console.log(`⬇ Enlace directo: ${downloadLink}`);

    return { viewLink: data.webViewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error subiendo PDF a Drive:", err);
    throw new Error("Error al subir PDF a Google Drive");
  }
}

/**
 * 💾 Sube archivo genérico (foto o archivo de evidencia)
 */
export async function uploadFileBufferToDrive(fileBuffer, fileName, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const tempPath = path.join("/tmp", fileName);
    fs.writeFileSync(tempPath, fileBuffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(tempPath)
    };

    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true
    });

    fs.unlinkSync(tempPath);
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;
    console.log(`✅ Archivo subido: ${downloadLink}`);

    return { viewLink: data.webViewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive:", err);
    throw new Error("Error al subir archivo a Google Drive");
  }
}

/**
 * 🖊️ Sube una imagen en base64 (firma del inquilino)
 */
export async function uploadBase64ImageToDrive(base64Data, fileName, codigo) {
  try {
    if (!base64Data || typeof base64Data !== "string" || !base64Data.startsWith("data:image/")) {
      throw new Error("Formato de imagen inválido o vacío");
    }

    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const base64Content = base64Data.split(";base64,").pop();
    const buffer = Buffer.from(base64Content, "base64");

    const tempFilePath = `/tmp/${fileName}.png`;
    fs.writeFileSync(tempFilePath, buffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: "image/png",
      body: fs.createReadStream(tempFilePath)
    };

    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true
    });

    fs.unlinkSync(tempFilePath);

    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;
    console.log(`✅ Imagen subida correctamente: ${downloadLink}`);

    return { viewLink: data.webViewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error al subir imagen base64 a Drive:", err);
    throw new Error("Error al subir imagen");
  }
}
