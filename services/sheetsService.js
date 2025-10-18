import { google } from "googleapis";

/**
 * =====================================================
 * 🔹 Inicializa el cliente de Google Sheets
 * =====================================================
 */
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

/**
 * =====================================================
 * 🔹 Obtiene todas las filas de una hoja
 * =====================================================
 */
export async function getSheetData(sheetName) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  return res.data.values || [];
}

/**
 * =====================================================
 * 🔹 Agrega una nueva fila
 * =====================================================
 */
export async function appendRow(sheetName, rowData) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    resource: { values: [rowData] },
  });
}

/**
 * =====================================================
 * 🔹 Actualiza una celda específica
 * =====================================================
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} range - Ejemplo: 'Usuarios!D5'
 * @param {string|number} value - Nuevo valor
 */
export async function updateCell(sheetName, range, value) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [[value]] },
  });
}

/**
 * =====================================================
 * 🔹 Elimina una fila completa de la hoja
 * =====================================================
 * ⚠️ Importante: este método usa batchUpdate para eliminar
 * la fila físicamente (no solo limpiar las celdas).
 */
export async function deleteRow(sheetName, rowIndex) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Google Sheets usa índices base 0 (por eso restamos 1)
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMeta.data.sheets.find(
    (s) => s.properties.title === sheetName
  );

  if (!sheet) throw new Error(`No se encontró la hoja ${sheetName}`);

  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // base 0
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });

  console.log(`🗑️ Fila ${rowIndex} eliminada de ${sheetName}`);
}

/**
 * =====================================================
 * 🔹 Devuelve las órdenes formateadas (para módulo técnico)
 * =====================================================
 */
export async function getSheet() {
  const data = await getSheetData("Órdenes");
  if (!data.length) return { headers: [], rows: [] };

  const headers = data[0];
  const rows = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i] || ""));
    return obj;
  });

  return { headers, rows };
}

