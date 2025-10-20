// routes/orders.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { getSheetData, appendRow, updateCell } from "../services/sheetsService.js";

const router = express.Router();
const SHEET_NAME = "Órdenes"; // nombre exacto de la hoja
const upload = multer({ dest: "uploads/" });

/* -------------------------------------------------------------------------- */
/* 🔹 CONFIGURACIÓN GOOGLE DRIVE                                              */
/* -------------------------------------------------------------------------- */
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

/* -------------------------------------------------------------------------- */
/* 🔹 LISTAR TODAS LAS ÓRDENES                                                */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((r, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = r[j] || ""));
      obj.fila = i + 2;
      return obj;
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error al listar órdenes:", err);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 OBTENER UNA ORDEN POR FILA O CÓDIGO                                     */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    const id = req.params.id;
    const headers = rows[0];

    // Buscar por código o fila
    const orden = rows.find(
      (r, i) => r[4] === id || String(i + 1) === id // columna 5 = código
    );

    if (!orden) return res.status(404).json({ error: "Orden no encontrada" });

    const obj = {};
    headers.forEach((h, j) => (obj[h] = orden[j] || ""));
    res.json(obj);
  } catch (err) {
    console.error("❌ Error al obtener orden:", err);
    res.status(500).json({ error: "Error al obtener la orden" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 CREAR NUEVA ORDEN                                                       */
/* -------------------------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const { cliente, telefono, codigo, descripcion, tecnico, estado } = req.body;
    if (!cliente || !telefono || !codigo || !descripcion || !tecnico || !estado)
      return res.status(400).json({ error: "Faltan datos obligatorios" });

    const fecha = new Date().toLocaleDateString("es-CO");
    await appendRow(SHEET_NAME, [
      cliente,
      fecha,
      "", // inquilino
      telefono,
      codigo,
      descripcion,
      tecnico,
      estado,
      "", "", "", "", "", "", "", "" // columnas extra
    ]);

    console.log(`✅ Orden ${codigo} creada correctamente`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error al crear orden:", err);
    res.status(500).json({ error: "Error al crear orden" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 GUARDAR FIRMA DEL INQUILINO                                            */
/* -------------------------------------------------------------------------- */
router.post("/:id/sign", async (req, res) => {
  try {
    const { nombreFirmante, firmaData } = req.body;
    const id = req.params.id;

    if (!firmaData || !nombreFirmante)
      return res.status(400).json({ error: "Datos de firma incompletos" });

    const base64Data = firmaData.replace(/^data:image\/png;base64,/, "");
    const filePath = `uploads/firma_${id}.png`;
    fs.writeFileSync(filePath, base64Data, "base64");

    // Subir firma a Drive
    const fileMetadata = {
      name: `Firma_${id}.png`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: "image/png",
      body: fs.createReadStream(filePath),
    };
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    fs.unlinkSync(filePath);
    const firmaURL = response.data.webViewLink;

    // Guardar en la hoja
    const rows = await getSheetData(SHEET_NAME);
    const fila = parseInt(id);
    const headers = rows[0];
    const idxFirma = headers.findIndex((h) =>
      /firma/i.test(h)
    );

    if (idxFirma >= 0) await updateCell(SHEET_NAME, fila, idxFirma + 1, firmaURL);
    console.log(`✍️ Firma guardada en Drive (${nombreFirmante})`);
    res.json({ ok: true, firmaURL });
  } catch (err) {
    console.error("❌ Error al guardar firma:", err);
    res.status(500).json({ error: "Error al guardar firma" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 GUARDAR MATERIALES / OBSERVACIONES                                     */
/* -------------------------------------------------------------------------- */
router.post("/update", async (req, res) => {
  try {
    const { fila, materiales, observaciones, estado } = req.body;
    if (!fila) return res.status(400).json({ error: "Fila requerida" });

    const updates = [];
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];

    if (materiales) {
      const idx = headers.findIndex((h) => /materiales/i.test(h));
      if (idx >= 0) updates.push(updateCell(SHEET_NAME, fila, idx + 1, materiales));
    }

    if (observaciones) {
      const idx = headers.findIndex((h) => /observaciones|trabajo/i.test(h));
      if (idx >= 0) updates.push(updateCell(SHEET_NAME, fila, idx + 1, observaciones));
    }

    if (estado) {
      const idx = headers.findIndex((h) => /estado/i.test(h));
      if (idx >= 0) updates.push(updateCell(SHEET_NAME, fila, idx + 1, estado));
    }

    await Promise.all(updates);
    console.log(`✏️ Orden actualizada correctamente (fila ${fila})`);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error al actualizar orden:", err);
    res.status(500).json({ error: "Error al actualizar orden" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 FINALIZAR ORDEN (CAMBIO DE ESTADO Y AVISO A DAYAN)                     */
/* -------------------------------------------------------------------------- */
router.post("/:id/finish", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxEstado = headers.findIndex((h) => /estado/i.test(h));
    const fila = parseInt(id);

    await updateCell(SHEET_NAME, fila, idxEstado + 1, "Finalizada");
    console.log(`✅ Orden fila ${fila} marcada como finalizada`);

    // 🔔 Envío simbólico al área de Dayan (se filtra por estado "Finalizada")
    res.json({ ok: true, message: "Orden finalizada y enviada a Dayan." });
  } catch (err) {
    console.error("❌ Error al finalizar orden:", err);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔹 SUBIR FOTOS AL DRIVE (ANTES / DESPUÉS)                                 */
/* -------------------------------------------------------------------------- */
router.post("/:id/upload-photo", upload.single("foto"), async (req, res) => {
  try {
    const id = req.params.id;
    const tipo = req.body.tipo || "desconocido";
    const filePath = req.file.path;

    const fileMetadata = {
      name: `Foto_${tipo}_${id}.jpg`,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    fs.unlinkSync(filePath);
    const fileURL = response.data.webViewLink;

    // Guardar enlace en hoja
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const fila = parseInt(id);
    const idx = headers.findIndex((h) => new RegExp(tipo, "i").test(h));
    if (idx >= 0) await updateCell(SHEET_NAME, fila, idx + 1, fileURL);

    res.json({ ok: true, fileURL });
  } catch (err) {
    console.error("❌ Error al subir foto:", err);
    res.status(500).json({ error: "Error al subir foto" });
  }
});

export { router };
