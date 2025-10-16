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

/** 📁 Crear carpeta de orden si no existe */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();
  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (res.data.files.length > 0) return res.data.files[0].id;

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

  console.log(`📂 Carpeta creada: ${folder.data.id}`);
  return folder.data.id;
}

/** ☁️ Subir PDF a Drive */
export async function uploadPDFToDrive(filePath, codigo) {
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

  console.log(`✅ PDF subido: ${data.webViewLink}`);
  return { webViewLink: data.webViewLink };
}

/** 🖋️ Subir imagen base64 (firma) */
export async function uploadBase64ImageToDrive(base64Input, nombre, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  const base64String =
    typeof base64Input === "string" ? base64Input : base64Input?.dataUrl || "";
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const tempFilePath = `/tmp/${nombre}.png`;
  fs.writeFileSync(tempFilePath, buffer);

  const fileMetadata = { name: `${nombre}.png`, parents: [folderId] };
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
}

/** 💾 Subir archivos desde buffer (fotos antes/después) */
export async function uploadFileBufferToDrive(fileInput, fileName, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);
  const fileBuffer = fileInput?.buffer || fileInput;

  const tempFilePath = `/tmp/${fileName}`;
  fs.writeFileSync(tempFilePath, fileBuffer);

  const fileMetadata = { name: fileName, parents: [folderId] };
  const media = { mimeType: "application/octet-stream", body: fs.createReadStream(tempFilePath) };

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
}
