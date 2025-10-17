import { google } from "googleapis";
import fs from "fs";
import path from "path";
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

/** Busca o crea carpeta de la orden dentro de la carpeta raíz configurada */
export async function ensureOrderFolder(codigo) {
  const drive = getDriveClient();

  // Buscar existente
  const q = [
    `'${GOOGLE_DRIVE_FOLDER_ID}' in parents`,
    `name='Orden_${codigo}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    `trashed=false`
  ].join(" and ");

  const found = await drive.files.list({ q, fields: "files(id,name)" });
  if (found.data.files?.length) {
    console.log(`📁 Carpeta existente para Orden_${codigo}`);
    return found.data.files[0].id;
  }

  // Crear si no existe
  const { data } = await drive.files.create({
    resource: {
      name: `Orden_${codigo}`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    },
    fields: "id",
    supportsAllDrives: true
  });

  console.log(`📂 Carpeta creada para la orden Orden_${codigo}: ${data.id}`);
  return data.id;
}

/** Sube un archivo físico (PDF) a Drive y devuelve links */
export async function uploadPDFToDrive(filePath, codigo) {
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
    fields: "id",
    supportsAllDrives: true,
  });

  // Público (con enlace)
  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
  const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;

  console.log(`✅ PDF subido: ${viewLink}`);
  console.log(`⬇ Enlace directo: ${downloadLink}`);

  return { id: data.id, viewLink, downloadLink };
}

/** Normaliza entrada (Buffer o objeto Multer) y devuelve {buffer, mime} */
function normalizeFileInput(fileOrBuffer, fallbackMime = "application/octet-stream") {
  if (Buffer.isBuffer(fileOrBuffer)) {
    return { buffer: fileOrBuffer, mime: fallbackMime };
  }
  if (fileOrBuffer && fileOrBuffer.buffer) {
    return { buffer: fileOrBuffer.buffer, mime: fileOrBuffer.mimetype || fallbackMime };
  }
  throw new TypeError("Se esperaba un Buffer o el objeto de Multer con 'buffer'.");
}

/** Sube archivo binario (fotos antes/después) usando buffer o objeto Multer */
export async function uploadFileBufferToDrive(fileOrBuffer, fileName, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    const { buffer, mime } = normalizeFileInput(fileOrBuffer, "application/octet-stream");

    const tmp = `/tmp/${Date.now()}_${fileName}`;
    fs.writeFileSync(tmp, buffer); // <— aquí necesitábamos un Buffer
    const media = { mimeType: mime, body: fs.createReadStream(tmp) };

    const { data } = await drive.files.create({
      resource: { name: fileName, parents: [folderId] },
      media,
      fields: "id",
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    try { fs.unlinkSync(tmp); } catch {}

    const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;
    console.log(`✅ Archivo subido: ${viewLink}`);

    return { id: data.id, viewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive:", err);
    throw new Error("Error al subir archivo a Google Drive");
  }
}

/** Sube imagen base64 (firma) y devuelve links */
export async function uploadBase64ImageToDrive(dataUrlOrBase64, fileNameNoExt, codigo) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureOrderFolder(codigo);

    // dataURL o base64 pelado
    let mime = "image/png";
    let base64 = dataUrlOrBase64 || "";
    if (base64.startsWith("data:")) {
      const [head, b64] = base64.split(",");
      base64 = b64 || "";
      const m = /data:(.*?);base64/.exec(head);
      if (m) mime = m[1] || mime;
    }
    if (!base64) throw new Error("Formato de imagen inválido o vacío");

    const buffer = Buffer.from(base64, "base64");

    const tmp = `/tmp/${fileNameNoExt}.${mime.includes("jpeg") ? "jpg" : "png"}`;
    fs.writeFileSync(tmp, buffer);

    const { data } = await drive.files.create({
      resource: { name: path.basename(tmp), parents: [folderId] },
      media: { mimeType: mime, body: fs.createReadStream(tmp) },
      fields: "id",
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });

    try { fs.unlinkSync(tmp); } catch {}

    const viewLink = `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${data.id}`;
    console.log(`✅ Imagen subida: ${viewLink}`);

    return { id: data.id, viewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error al subir imagen base64 a Drive:", err);
    throw new Error("Error al subir imagen");
  }
}
