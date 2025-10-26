// ======================================================
// 📦 Blue Home Gestor — Servicio de Google Drive (Shared Drive Ready)
// ======================================================
import { google } from "googleapis";
import fs from "fs";

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/drive"]
);

const drive = google.drive({ version: "v3", auth });

// ======================================================
// 🔹 Verifica o crea carpeta destino dentro del Shared Drive
// ======================================================
async function ensureFolderExists(folderId) {
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name",
      supportsAllDrives: true,
    });
    console.log(`✅ Carpeta detectada en Drive: ${res.data.name}`);
    return folderId;
  } catch (err) {
    if (err.code === 404) {
      console.warn("⚠️ Carpeta no encontrada. Creando una nueva en la Unidad Compartida...");
      const newFolder = await drive.files.create({
        resource: {
          name: "BlueHome_Gestor_Fotos",
          mimeType: "application/vnd.google-apps.folder",
          driveId: process.env.GOOGLE_DRIVE_FOLDER_ID, // raíz de la unidad
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        fields: "id, webViewLink",
        supportsAllDrives: true,
      });
      console.log(`📁 Nueva carpeta creada: ${newFolder.data.webViewLink}`);
      return newFolder.data.id;
    } else {
      console.error("❌ Error verificando carpeta:", err);
      throw err;
    }
  }
}

// ======================================================
// 🔹 Subir archivo a la Unidad Compartida
// ======================================================
export async function uploadFileToDrive(filePath, fileName) {
  try {
    const folderId = await ensureFolderExists(process.env.GOOGLE_DRIVE_FOLDER_ID);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;

    // 🔓 Permitir acceso público de solo lectura
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });

    const file = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink",
      supportsAllDrives: true,
    });

    console.log(`✅ Archivo subido correctamente: ${fileName}`);
    return file.data;
  } catch (e) {
    console.error("❌ Error al subir archivo a Drive (Shared Drive):", e.message);
    throw e;
  }
}
