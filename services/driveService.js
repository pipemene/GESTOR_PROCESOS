import { google } from "googleapis";
import fs from "fs";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_FOLDER_ID
} from "../config.js";

/**
 * 🔹 Sube un archivo PDF a Google Drive
 * @param {string} filePath - Ruta temporal del archivo en el servidor
 * @param {string} codigo - Código de la orden (usado para nombrar el PDF)
 * @returns {Promise<string>} - URL pública del archivo subido
 */
export async function uploadPDFToDrive(filePath, codigo) {
  try {
    // Autenticación con cuenta de servicio
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/drive"]
    );

    const drive = google.drive({ version: "v3", auth });

    // Metadata del archivo
    const fileMetadata = {
      name: `Orden_${codigo}.pdf`,
      parents: [GOOGLE_DRIVE_FOLDER_ID], // Carpeta principal en Drive
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath),
    };

    // Subir archivo
    const { data } = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    // Hacerlo público
    await drive.permissions.create({
      fileId: data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    console.log(`✅ Archivo subido a Drive: ${data.webViewLink}`);
    return data.webViewLink;
  } catch (error) {
    console.error("❌ Error al subir PDF a Drive:", error);
    throw new Error("Error al subir PDF a Google Drive");
  }
}

/**
 * 🔹 Crea una carpeta dentro de la carpeta raíz de Drive (si querés separar órdenes)
 * @param {string} nombre - Nombre de la carpeta
 * @returns {Promise<string>} - ID de la carpeta creada
 */
export async function createOrderFolder(nombre) {
  try {
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/drive"]
    );

    const drive = google.drive({ version: "v3", auth });

    const { data } = await drive.files.create({
      resource: {
        name: nombre,
        mimeType: "application/vnd.google-apps.folder",
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      },
      fields: "id",
    });

    console.log(`📁 Carpeta creada en Drive: ${nombre} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error("❌ Error al crear carpeta en Drive:", error);
    throw new Error("Error creando carpeta en Google Drive");
  }
}
