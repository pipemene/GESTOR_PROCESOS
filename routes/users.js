// routes/users.js
import express from "express";
import { google } from "googleapis";

const router = express.Router();
const sheets = google.sheets("v4");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Usuarios";

// 🧩 Helper: inicializa cliente autenticado de Google Sheets
async function getClient(scopes = ["https://www.googleapis.com/auth/spreadsheets"]) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes,
  });
  return auth.getClient();
}

// =====================================================
// 🔹 GET: Listar todos los usuarios
// =====================================================
router.get("/", async (req, res) => {
  try {
    const client = await getClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:D`,
    });

    const users = (response.data.values || []).map((u, i) => ({
      fila: i + 2,
      nombre: u[0] || "",
      usuario: u[1] || "",
      contrasena: u[2] || "",
      rol: u[3] || "",
    }));

    res.json(users);
  } catch (e) {
    console.error("❌ Error al listar usuarios:", e);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

// =====================================================
// 🔹 POST: Crear usuario nuevo
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    if (!nombre || !usuario || !contrasena || !rol)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    // 🔸 Verificar si ya existe el usuario
    const client = await getClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
    const existing = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!B2:B`,
    });

    const usuariosExistentes = (existing.data.values || []).flat().map(u => u.toLowerCase());
    if (usuariosExistentes.includes(usuario.toLowerCase())) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // 🔸 Crear nuevo usuario
    const writeClient = await getClient();
    await sheets.spreadsheets.values.append({
      auth: writeClient,
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nombre, usuario, contrasena, rol]] },
    });

    console.log(`✅ Usuario '${usuario}' creado correctamente`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear usuario:", e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// =====================================================
// 🔹 PATCH: Actualizar usuario existente (por fila)
// =====================================================
router.patch("/update", async (req, res) => {
  try {
    const { fila, nombre, usuario, contrasena, rol } = req.body;
    if (!fila) return res.status(400).json({ error: "Fila requerida" });

    const client = await getClient();
    const range = `${SHEET_NAME}!A${fila}:D${fila}`;

    await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nombre, usuario, contrasena, rol]] },
    });

    console.log(`✏️ Usuario en fila ${fila} actualizado correctamente`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// =====================================================
// 🔹 DELETE: Eliminar usuario por fila
// =====================================================
router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    if (isNaN(fila)) return res.status(400).json({ error: "Fila inválida" });

    const client = await getClient();
    await sheets.spreadsheets.batchUpdate({
      auth: client,
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // ✅ Asegúrate de que sea la hoja principal
                dimension: "ROWS",
                startIndex: fila - 1,
                endIndex: fila,
              },
            },
          },
        ],
      },
    });

    console.log(`🗑️ Usuario en fila ${fila} eliminado`);
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al eliminar usuario:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
