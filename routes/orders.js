import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🔐 Configuración de credenciales
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const auth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 🧾 Función para obtener la hoja activa
async function getSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();
  let sheet = doc.sheetsByTitle["ordenes"];
  if (!sheet) sheet = doc.sheetsByIndex[0]; // Si no existe "ordenes", usa la primera hoja
  return sheet;
}

// 📥 Obtener todas las órdenes
router.get("/", async (req, res) => {
  try {
    const sheet = await getSheet();
    if (!sheet) throw new Error("No se encontró ninguna hoja válida en el documento");

    const rows = await sheet.getRows();
    const ordenes = rows.map((r) => ({
      codigo: r.Código || "",
      arrendatario: r.Inquilino || "",
      telefono: r.Telefono || "",
      tecnico: r.Tecnico || "",
      estado: r.Estado || "Pendiente",
      observacion: r.Descripcion || "",
      fecha: r.Fecha || "",
    }));
    res.json(ordenes);
  } catch (error) {
    console.error("❌ Error al obtener órdenes:", error.message);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

// 🆕 Crear una nueva orden
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono = "", tecnico = "Sin asignar", observacion = "" } = req.body;
    if (!codigo || !arrendatario)
      return res.status(400).json({ message: "Código y arrendatario son obligatorios" });

    const sheet = await getSheet();
    if (!sheet) throw new Error("No se encontró la hoja 'ordenes' en el documento");

    const fecha = new Date().toLocaleString("es-CO");

    const nuevaOrden = {
      cliente: "BLUE HOME INMOBILIARIA",
      Fecha: fecha,
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: codigo,
      Descripcion: observacion,
      Tecnico: tecnico,
      Estado: "Pendiente",
    };

    await sheet.addRow(nuevaOrden);
    res.status(201).json({ message: "✅ Orden creada correctamente", data: nuevaOrden });
  } catch (error) {
    console.error("❌ Error al crear orden:", error.message);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

export default router;
