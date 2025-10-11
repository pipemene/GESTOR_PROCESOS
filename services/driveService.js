import { google } from "googleapis";
import fs from "fs";
import path from "path";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} from "../config.js";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export async function ensureOrderFolder(rootFolderId, codigo) {
  const res = await drive.files.list({
    q: `'${rootFolderId}' in parents and name='${codigo}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });
  if (res.data.files.length) return res.data.files[0].id;

  const folder = await drive.files.create({
    resource: {
      name: codigo,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });
  return folder.data.id;
}

export async function uploadPDFtoDrive(folderId, filePath, fileName) {
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: fs.createReadStream(filePath),
    },
    fields: "id, webViewLink, webContentLink",
  });

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return res.data.webViewLink;
}
