import express from "express";
import { google } from "googleapis";

const router = express.Router();
const sheets = google.sheets("v4");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ✅ Listar usuarios
router.get("/", async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId: SHEET_ID,
      range: "Usuarios!A2:D",
    });

    const users = (response.data.values || []).map((u, i) => ({
      fila: i + 2,
      nombre: u[0],
      usuario: u[1],
      contrasena: u[2],
      rol: u[3],
    }));

    res.json(users);
  } catch (e) {
    console.error("❌ Error al listar usuarios:", e);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

// ✅ Crear usuario
router.post("/", async (req, res) => {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    if (!nombre || !usuario || !contrasena || !rol)
      return res.status(400).json({ error: "Faltan datos" });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId: SHEET_ID,
      range: "Usuarios!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nombre, usuario, contrasena, rol]] },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear usuario:", e);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ✅ Actualizar usuario
router.patch("/update", async (req, res) => {
  try {
    const { fila, nombre, usuario, contrasena, rol } = req.body;
    if (!fila) return res.status(400).json({ error: "Fila requerida" });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    const range = `Usuarios!A${fila}:D${fila}`;
    await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nombre, usuario, contrasena, rol]] },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al actualizar usuario:", e);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// ✅ Eliminar usuario
router.delete("/delete/:fila", async (req, res) => {
  try {
    const fila = parseInt(req.params.fila);
    if (isNaN(fila)) return res.status(400).json({ error: "Fila inválida" });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    await sheets.spreadsheets.batchUpdate({
      auth: client,
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId: 0, dimension: "ROWS", startIndex: fila - 1, endIndex: fila },
            },
          },
        ],
      },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al eliminar usuario:", e);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;
