import { google } from "googleapis";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SHEET_ID,
} from "./config.js";

async function testSheets() {
  console.log("🚀 Iniciando prueba de conexión con Google Sheets...");

  try {
    if (!GOOGLE_SHEET_ID) {
      throw new Error("❌ GOOGLE_SHEET_ID no está definido. Verifica tus variables en Railway.");
    }

    // Autenticación
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Probar lectura simple
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Órdenes!A1:D5", // Ajusta el nombre de la hoja si es distinto
    });

    console.log("✅ Conexión exitosa a la hoja de cálculo.");
    console.log("📋 Primeras celdas leídas:");
    console.table(response.data.values);

  } catch (error) {
    console.error("❌ Error al conectar con Google Sheets:");
    console.error(error.message);
  }
}

testSheets();
