// services/driveService.js
import { google } from "googleapis";
import fs from "fs";

// 🔹 Autenticación con la cuenta de servicio
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// ======================================================
// 🔹 Verificar o crear carpeta destino
// ======================================================
export async function ensureFolderExists(folderName) {
  try {
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Verificar si la carpeta ya existe
    const res = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files.length > 0) {
      console.log(`📁 Carpeta detectada en Drive: ${folderName}`);
      return res.data.files[0].id;
    }

    // Crear carpeta si no existe
    const folder = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    console.log(`📂 Carpeta creada en Drive: ${folderName}`);
    return folder.data.id;
  } catch (err) {
    console.error("❌ Error al verificar/crear carpeta en Drive:", err);
    throw err;
  }
}

// ======================================================
// 🔹 Subir archivo a Drive (solo para miembros de la unidad)
// ======================================================
export async function uploadFileToDrive(filePath, fileName, folderName = null) {
  try {
    let parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Si se pasa un folderName, crear o usar subcarpeta
    if (folderName) {
      parentId = await ensureFolderExists(folderName);
    }

    const fileMetadata = {
      name: fileName,
      parents: [parentId],
    };

    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = file.data.id;
    console.log(`✅ Archivo subido correctamente: ${fileName}`);

    // No intentar cambiar permisos (el Shared Drive ya maneja herencia)
    return {
      id: fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
    };
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive (Shared Drive):", err.message);
    throw err;
  }
}
