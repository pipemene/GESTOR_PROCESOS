// ======================================================
// 📂 Blue Home Gestor — Servicio Google Drive (solo PDFs)
// ======================================================
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
// 🔹 Verificar o crear carpeta destino (en unidad compartida)
// ======================================================
export async function ensureFolderExists(folderName) {
  try {
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
    console.error("❌ Error verificando/creando carpeta en Drive:", err);
    throw err;
  }
}

// ======================================================
// 🔹 Subir archivo PDF al Drive
// ======================================================
export async function uploadFileToDrive(filePath, fileName, folderName = "BlueHome_Gestor_PDFs") {
  try {
    const parentId = await ensureFolderExists(folderName);

    const fileMetadata = {
      name: fileName,
      parents: [parentId],
    };

    const media = {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    console.log(`✅ PDF subido correctamente: ${fileName}`);

    return {
      id: fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
    };
  } catch (err) {
    console.error("❌ Error al subir PDF a Drive:", err.message);
    throw err;
  }
}
