// ======================================================
// 📂 services/driveService.js (versión auto-reparadora)
// Blue Home Gestor - Manejo de archivos en Google Drive
// ======================================================

import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// ======================================================
// 🔹 Autenticación con Google API
// ======================================================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// ======================================================
// 🔹 Verificar o crear carpeta raíz automáticamente
// ======================================================
export async function ensureRootFolder() {
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  try {
    if (!folderId) throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID");

    // Verificar existencia
    const check = await drive.files.get({ fileId: folderId, fields: "id, name" }).catch(() => null);
    if (!check) throw new Error("Carpeta raíz no encontrada");

    console.log(`📁 Carpeta raíz válida: ${check.data.name}`);
    return folderId;
  } catch (err) {
    console.warn("⚠️ Carpeta raíz inválida o borrada, se creará una nueva...");

    // Crear carpeta nueva en Drive
    const newFolder = await drive.files.create({
      resource: {
        name: "BlueHome_Gestor_Files",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, webViewLink",
    });

    const newId = newFolder.data.id;
    console.log(`✅ Nueva carpeta creada automáticamente: ${newFolder.data.webViewLink}`);

    // 🔧 Actualizar variable en ejecución
    process.env.GOOGLE_DRIVE_FOLDER_ID = newId;

    // Intentar actualizar el archivo .env local (si existe)
    try {
      if (fs.existsSync(".env")) {
        let envData = fs.readFileSync(".env", "utf-8");
        if (envData.includes("GOOGLE_DRIVE_FOLDER_ID=")) {
          envData = envData.replace(/GOOGLE_DRIVE_FOLDER_ID=.*/g, `GOOGLE_DRIVE_FOLDER_ID="${newId}"`);
        } else {
          envData += `\nGOOGLE_DRIVE_FOLDER_ID="${newId}"`;
        }
        fs.writeFileSync(".env", envData);
        console.log("🧩 .env actualizado con nuevo GOOGLE_DRIVE_FOLDER_ID");
      }
    } catch (err2) {
      console.warn("⚠️ No se pudo actualizar el archivo .env, pero el sistema seguirá funcionando.");
    }

    return newId;
  }
}

// ======================================================
// 🔹 Subir imagen en base64 (firmas)
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
    console.error("❌ Error al subir imagen base64:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Subir archivo recibido por formulario (fotos)
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

    console.log(`✅ Archivo ${file.originalname} subido correctamente`);
    return response.data.webViewLink;
  } catch (err) {
    console.error("❌ Error al subir archivo:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Crear carpeta individual por orden
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

    console.log(`📂 Carpeta creada para orden ${orderCode}`);
    return res.data.id;
  } catch (err) {
    console.error("❌ Error al crear carpeta de orden:", err.message);
    throw err;
  }
}
