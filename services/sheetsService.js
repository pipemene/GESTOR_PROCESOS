import { google } from 'googleapis';

/**
 * Inicializa la conexión con Google Sheets API usando la cuenta de servicio
 */
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Obtiene todas las filas de una hoja
 * @param {string} sheetName - Nombre de la hoja (pestaña)
 */
export async function getSheetData(sheetName) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: sheetName,
  });
  return res.data.values || [];
}

/**
 * Agrega una nueva fila al final de la hoja
 * @param {string} sheetName - Nombre de la hoja
 * @param {Array} rowData - Arreglo con los datos a insertar
 */
export async function appendRow(sheetName, rowData) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [rowData] },
  });
}

/**
 * Actualiza una celda específica en la hoja
 * @param {string} sheetName
 * @param {string} range - Ejemplo: 'Ordenes!F5'
 * @param {string|number} value - Valor nuevo
 */
export async function updateCell(sheetName, range, value) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] },
  });
}

/**
 * Elimina una fila (no muy usado porque Google Sheets no tiene método directo para borrar filas)
 * Aquí simplemente se puede sobrescribir el contenido con vacío si lo necesitás.
 */
export async function deleteRow(sheetName, rowIndex) {
  const sheets = getSheetsClient();
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range,
  });
}
