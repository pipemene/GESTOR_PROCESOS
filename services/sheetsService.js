// ======================================================
// 📄 services/sheetsService.js
// Blue Home Gestor - Conexión a Google Sheets
// ======================================================

import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// ======================================================
// 🔹 Autenticación con Google Service Account
// ======================================================
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

// ======================================================
// 🔹 Obtener datos de una hoja (corregido)
// ======================================================
export async function getSheetData(sheetName) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`, // ✅ rango completo, evita errores de rango vacío
    });

    const data = res.data.values || [];
    if (!data.length) {
      console.warn(`⚠️ Hoja ${sheetName} vacía o sin rango válido`);
    }
    return data;
  } catch (err) {
    console.error("❌ Error al obtener datos de Google Sheets:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Agregar nueva fila (ajuste tolerante)
// ======================================================
export async function appendRow(sheetName, values) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values: [values] },
    });
    console.log(`✅ Nueva fila agregada en hoja ${sheetName}`);
    return res.data;
  } catch (err) {
    console.error("❌ Error al agregar fila:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Actualizar una celda específica (CORREGIDO)
// ======================================================
export async function updateCell(sheetName, celda, valor) {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // ✅ Garantiza que siempre haya formato Hoja!Celda
    const rango = celda.includes("!") ? celda : `${sheetName}!${celda}`;

    const res = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: rango,
      valueInputOption: "USER_ENTERED",
      resource: { values: [[valor]] },
    });

    console.log(`✏️ Celda ${rango} actualizada correctamente con valor: ${valor}`);
    return res.data;
  } catch (err) {
    console.error("❌ Error en updateCell:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Eliminar fila completa
// ======================================================
export async function deleteRow(sheetName, rowIndex) {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await getSheetIdByName(sheetName),
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`🗑️ Fila ${rowIndex} eliminada en hoja ${sheetName}`);
  } catch (err) {
    console.error("❌ Error al eliminar fila:", err.message);
    throw err;
  }
}

// ======================================================
// 🔹 Obtener ID interno de una hoja por nombre
// ======================================================
async function getSheetIdByName(sheetName) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title.toLowerCase() === sheetName.toLowerCase()
  );

  if (!sheet) throw new Error(`Hoja no encontrada: ${sheetName}`);
  return sheet.properties.sheetId;
}

// ======================================================
// 🔹 Convertir índice numérico a letra de columna (A, B, C...)
// ======================================================
export function getExcelColumnName(colIndex) {
  let columnName = "";
  while (colIndex >= 0) {
    columnName = String.fromCharCode((colIndex % 26) + 65) + columnName;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return columnName;
}
