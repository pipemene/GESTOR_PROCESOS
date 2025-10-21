// ======================================================
// 📂 services/driveService.js
// Blue Home Gestor - Manejo de archivos en Google Drive
// ======================================================

import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// 🔹 Autenticación con Google API
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// ======================================================
// 🔹 Verifica o crea la carpeta raíz
// ======================================================
export async function ensureRootFolder() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("❌ Falta GOOGLE_DRIVE_FOLDER_ID en .env");

    // Verificar si existe la carpeta raíz
    const check = await drive.files.get({ fileId: folderId, fields: "id, name" }).catch(() => null);

    if (!check) {
      console.log("⚠️ Carpeta raíz no encontrada, se creará una nueva...");

      const newFolder = await drive.files.create({
        resource: {
          name: "BlueHome_Gestor_Files",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id, webViewLink",
      });

      console.log(`✅ Nueva carpeta creada en Drive: ${newFolder.data.webViewLink}`);
      return newFolder.data.id;
    }

    console.log(`📁 Carpeta raíz válida: ${check.data.name}`);
    return folderId;
  } catch (err) {
    console.error("❌ Error verificando carpeta raíz:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Sube imagen en base64 (firmas)
// ======================================================
export async function uploadBase64ImageToDrive(base64Data, fileName, folderId = null) {
  try {
    const rootFolder = await ensureRootFolder();
    const targetFolder = folderId || rootFolder;

    const buffer = Buffer.from(base64Data.split(",")[1], "base64");

    const fileMetadata = {
      name: fileName,
      parents: [targetFolder],
    };

    const media = {
      mimeType: "image/png",
      body: Buffer.from(buffer),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    console.log(`✅ Imagen subida a Drive: ${fileName}`);
    return response.data.webViewLink;
  } catch (err) {
    console.error("❌ Error al subir imagen base64:", err);
    throw err;
  }
}

// ======================================================
// 🔹 Sube archivo recibido por formulario (fotos)
// ======================================================
export async function uploadFileToDrive(file, tipo = "Foto", folderId = null) {
  try {
    const rootFolder = await ensureRootFolder();
    const targetFolder = folderId || rootFolder;

    const fileMetadata = {
      name: `${tipo}_${Date.now()}_${file.originalname}`,
      parents: [targetFolder],
    };

    const media = {
      mimeType: file.mimetype,
      body: Buffer.from(file.buffer),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    console.log(`✅ Archivo ${file.originalname} subido a Drive correctamente`);
    return response.data.webViewLink;
  } catch (err) {
    console.error("❌ Error al subir archivo a Drive:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Crea carpeta individual por orden (opcional)
// ======================================================
export async function createOrderFolder(orderCode) {
  try {
    const rootFolder = await ensureRootFolder();

    const res = await drive.files.create({
      resource: {
        name: `Orden_${orderCode}`,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolder],
      },
      fields: "id, webViewLink",
    });

    console.log(`📁 Carpeta creada para orden ${orderCode}`);
    return res.data.id;
  } catch (err) {
    console.error("❌ Error al crear carpeta de orden:", err.message);
    throw err;
  }
}
