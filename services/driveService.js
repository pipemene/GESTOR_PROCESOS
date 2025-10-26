// ======================================================
// 📦 Blue Home Gestor — Servicio de Google Drive
// ======================================================
import { google } from "googleapis";
import fs from "fs";

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/drive.file"]
);

const drive = google.drive({ version: "v3", auth });

// ======================================================
// 🔹 Crear carpeta si no existe
// ======================================================
async function ensureFolderExists(folderId) {
  try {
    const res = await drive.files.get({ fileId: folderId, fields: "id, name" });
    console.log(`✅ Carpeta detectada en Drive: ${res.data.name}`);
    return folderId;
  } catch (err) {
    if (err.code === 404) {
      console.warn("⚠️ Carpeta no encontrada, creando una nueva...");
      const newFolder = await drive.files.create({
        resource: {
          name: "BlueHome_Gestor_Fotos",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, webViewLink",
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
// 🔹 Subir archivo a Google Drive
// ======================================================
export async function uploadFileToDrive(filePath, fileName) {
  try {
    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    folderId = await ensureFolderExists(folderId);

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
    });

    const fileId = response.data.id;

    // Hacer público el archivo
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const file = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink",
    });

    console.log(`✅ Archivo subido correctamente: ${fileName}`);
    return file.data;
  } catch (e) {
    console.error("❌ Error al subir archivo a Drive:", e);
    throw e;
  }
}
