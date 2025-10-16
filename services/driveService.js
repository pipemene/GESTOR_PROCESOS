import { google } from "googleapis";
import fs from "fs";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID
} from "../config.js";

function getDriveClient() {
  const auth = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  return google.drive({ version: "v3", auth });
}

// ======================================================
// 📁 Crear o verificar carpeta por código de orden
// ======================================================
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();
  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({ q: query, fields: "files(id, name)" });
  if (res.data.files.length > 0) {
    console.log(`📁 Carpeta existente para Orden_${codigo}`);
    return res.data.files[0].id;
  }

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

  console.log(`📂 Carpeta creada para la orden Orden_${codigo}: ${folder.data.id}`);
  return folder.data.id;
}

// ======================================================
// ☁️ Subir un archivo Buffer (foto antes/después)
// ======================================================
export async function uploadFileBufferToDrive(fileBuffer, fileName, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const tempPath = `/tmp/${fileName}`;
    fs.writeFileSync(tempPath, fileBuffer);

    const fileMetadata = { name: fileName, parents: [folderId] };
    const media = { mimeType: "image/jpeg", body: fs.createReadStream(tempPath) };

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

    fs.unlinkSync(tempPath);

    const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;

    console.log(`✅ Archivo subido: ${viewLink}`);
    return { viewLink, downloadLink };
  } catch (error) {
    console.error("❌ Error al subir archivo a Drive:", error);
    throw new Error("Error al subir archivo a Google Drive");
  }
}

// ======================================================
// 🖋️ Subir imagen base64 (firma)
// ======================================================
export async function uploadBase64ImageToDrive(base64Data, fileName, codigo) {
  try {
    if (!base64Data || typeof base64Data !== "string" || !base64Data.includes("base64,")) {
      throw new Error("Formato de imagen inválido o vacío");
    }

    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const base64String = base64Data.split("base64,")[1];
    const buffer = Buffer.from(base64String, "base64");
    const tempPath = `/tmp/${fileName}.png`;
    fs.writeFileSync(tempPath, buffer);

    const fileMetadata = { name: `${fileName}.png`, parents: [folderId] };
    const media = { mimeType: "image/png", body: fs.createReadStream(tempPath) };

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

    fs.unlinkSync(tempPath);

    const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;

    console.log(`✅ Imagen subida: ${viewLink}`);
    return { viewLink, downloadLink };
  } catch (error) {
    console.error("❌ Error al subir imagen base64 a Drive:", error);
    throw new Error("Error al subir imagen");
  }
}

// ======================================================
// 📄 Subir PDF de orden
// ======================================================
export async function uploadPDFToDrive(filePath, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const fileMetadata = { name: `Orden_${codigo}.pdf`, parents: [folderId] };
    const media = { mimeType: "application/pdf", body: fs.createReadStream(filePath) };

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

    const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;

    console.log(`✅ PDF subido: ${viewLink}`);
    console.log(`⬇ Enlace directo: ${downloadLink}`);
    return { viewLink, downloadLink };
  } catch (error) {
    console.error("❌ Error subiendo PDF a Drive:", error);
    throw new Error("Error al subir PDF a Google Drive");
  }
}
