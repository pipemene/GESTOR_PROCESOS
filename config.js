// ===============================
// CONFIGURACIÓN GLOBAL BLUE HOME
// ===============================

import dotenv from "dotenv";
dotenv.config();

// ===============================
// VARIABLES DE ENTORNO
// ===============================
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// ===============================
// CONFIGURACIÓN GENERAL DEL SERVIDOR
// ===============================
export const SERVER_PORT = process.env.PORT || 3000;
export const BASE_URL = process.env.BASE_URL || "https://gestorprocesos-production.up.railway.app";

// ===============================
// VALIDACIÓN INICIAL
// ===============================
console.log("✅ Archivo config.js cargado correctamente.");
console.log("📁 Variables activas:");
console.log({
  GOOGLE_SHEET_ID,
  DRIVE_FOLDER_ID,
  GMAIL_USER,
  SERVER_PORT,
});
