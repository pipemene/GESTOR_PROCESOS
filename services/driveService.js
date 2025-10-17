import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID } from "../config.js";

const auth = new google.auth.JWT(
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/drive"]
);
const drive = google.drive({ version: "v3", auth });

// ✅ Crea carpeta para cada orden (si no existe)
export async function ensureOrderFolder(codigo) {
  const folderName = `Orden_${codigo}`;
  const res = await drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (res.data.files.length) {
    console.log("📁 Carpeta existente para", folderName);
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    },
    fields: "id",
  });

  console.log("📂 Carpeta creada para la orden", folderName, ":", folder.data.id);
  return folder.data.id;
}

// ✅ Sube un archivo a Drive desde buffer
export async function uploadFileBufferToDrive(file, filename, codigo) {
  try {
    const folderId = await ensureOrderFolder(codigo);
    const tempPath = path.join("/tmp", filename);

    fs.writeFileSync(tempPath, file.buffer); // ✅ Ahora es buffer real

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(tempPath),
      },
      fields: "id, webViewLink, webContentLink",
    });

    fs.unlinkSync(tempPath); // 🔥 Limpieza
    const { id, webViewLink, webContentLink } = res.data;
    const viewLink = `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${id}`;

    console.log("✅ Archivo subido:", viewLink);
    return { viewLink, downloadLink };
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive:", err);
    throw new Error("Error al subir archivo a Google Drive");
  }
}

// ✅ Sube imágenes base64 (firmas)
export async function uploadBase64ImageToDrive(base64, filename, codigo) {
  const buffer = Buffer.from(base64.split(",")[1], "base64");
  return await uploadFileBufferToDrive({ buffer, mimetype: "image/png" }, `${filename}.png`, codigo);
}

// ✅ Sube PDFs
export async function uploadPDFToDrive(pdfPath, codigo) {
  const folderId = await ensureOrderFolder(codigo);
  const fileName = `orden_${codigo}.pdf`;

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: fs.createReadStream(pdfPath),
    },
    fields: "id, webViewLink, webContentLink",
  });

  const { id, webViewLink, webContentLink } = res.data;
  const viewLink = `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
  const downloadLink = `https://drive.google.com/uc?export=download&id=${id}`;

  return { viewLink, downloadLink };
}
