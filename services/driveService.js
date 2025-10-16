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

  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='Orden_${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) {
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

    // Hacerlo público para ver sin iniciar sesión
    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
    });

    console.log(`✅ PDF subido correctamente: ${data.webViewLink}`);
    return { webViewLink: data.webViewLink };
  } catch (error) {
    console.error("❌ Error subiendo PDF a Drive:", error);
    throw new Error("Error al subir PDF a Google Drive");
  }
}

/**
 * 🖋️ Sube una firma en base64 o DataURL (maneja objeto o string)
 */
export async function uploadBase64ImageToDrive(input, nombre, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  // Acepta objeto tipo { dataUrl: "..." } o string directo
  const base64String = typeof input === "string" ? input : input?.dataUrl || input?.data || "";
  if (!base64String) throw new Error("Firma inválida: no contiene datos base64.");

  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const tempFilePath = `/tmp/${nombre}.png`;
  fs.writeFileSync(tempFilePath, buffer);

  const fileMetadata = {
    name: `${nombre}.png`,
    parents: [folderId],
  };

  const media = {
    mimeType: "image/png",
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
 * 💾 Sube directamente un archivo en buffer (por multer o buffer directo)
 */
export async function uploadFileBufferToDrive(fileInput, fileName, codigo) {
  const drive = getDriveClient();
  const folderId = await ensureOrderFolder(codigo);

  const fileBuffer = fileInput?.buffer || fileInput;
  if (!Buffer.isBuffer(fileBuffer)) throw new Error("Archivo inválido: se esperaba un buffer.");

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
