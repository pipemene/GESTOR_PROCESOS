import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SHEET_ID
} from "../config.js";

const router = express.Router();

// --- Autenticación con Google Service Account ---
const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// --- Función para obtener la hoja ---
async function getSheet() {
  const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc.sheetsByTitle["ordenes"];
}

// --- Generar un código nuevo incremental ---
async function generarCodigo(sheet) {
  const rows = await sheet.getRows();
  const ultimo = rows.length > 0 ? rows[rows.length - 1].get("Código") : null;
  let numero = 1;

  if (ultimo && ultimo.startsWith("BH-2025-")) {
    const partes = ultimo.split("-");
    numero = parseInt(partes[2]) + 1;
  }

  return `BH-2025-${numero}`;
}

// --- Crear una nueva orden ---
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    if (!codigo || !arrendatario || !telefono || !observacion) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios." });
    }

    const sheet = await getSheet();
    const nuevoCodigo = await generarCodigo(sheet);

    await sheet.addRow({
      cliente: "BLUE HOME INMOBILIARIA",
      Fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: nuevoCodigo,
      Descripcion: observacion,
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente"
    });

    return res.status(200).json({
      success: true,
      message: "Orden creada correctamente",
      codigo: nuevoCodigo
    });
  } catch (error) {
    console.error("❌ Error al crear orden:", error);
    return res.status(500).json({ success: false, message: "Error al crear la orden" });
  }
});

// --- Obtener todas las órdenes ---
router.get("/", async (req, res) => {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();

    const ordenes = rows.map((r) => ({
      codigo: r.get("Código"),
      arrendatario: r.get("Inquilino"),
      telefono: r.get("Telefono"),
      tecnico: r.get("Tecnico"),
      estado: r.get("Estado"),
      observacion: r.get("Descripcion"),
    }));

    return res.json(ordenes);
  } catch (error) {
    console.error("❌ ERROR AL OBTENER ÓRDENES:", error);
    return res.status(500).json({ success: false, message: "Error al obtener órdenes" });
  }
});

export default router;
