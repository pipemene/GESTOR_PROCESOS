import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🔐 Credenciales
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// 🔗 Autenticación
const auth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 📄 Conexión al documento
async function getSheet() {
  const doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Órdenes"] || doc.sheetsByTitle["ordenes"];
  return sheet || doc.sheetsByIndex[0];
}

// 🧠 Función para limpiar encabezados con espacios o caracteres raros
function limpiarCampo(nombre) {
  return nombre?.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// 📋 Obtener todas las órdenes
router.get("/", async (req, res) => {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();

    if (!rows.length) return res.json([]);

    // 👇 ESTE CONSOLE.LOG ES LA CLAVE
    console.log("Encabezados detectados:", Object.keys(rows[0]));

    const encabezados = Object.keys(rows[0]).reduce((mapa, clave) => {
      const limpio = limpiarCampo(clave);
      mapa[limpio] = clave;
      return mapa;
    }, {});

    const ordenes = rows.map((r, index) => ({
      id: index + 1,
      codigo: r[encabezados["codigo"]] || "",
      arrendatario: r[encabezados["inquilino"]] || "",
      telefono: r[encabezados["telefono"]] || "",
      tecnico: r[encabezados["tecnico"]] || "",
      estado: r[encabezados["estado"]] || "",
      observacion: r[encabezados["descripcion"]] || "",
    }));

    console.log("✅ Órdenes cargadas correctamente:", ordenes.length);
    res.json(ordenes);
  } catch (error) {
    console.error("❌ Error al obtener órdenes:", error);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

// 🆕 Crear orden
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;
    if (!codigo || !arrendatario) {
      return res.status(400).json({ message: "Código y arrendatario son obligatorios" });
    }

    const sheet = await getSheet();
    const fecha = new Date().toLocaleString("es-CO");

    const nuevaOrden = {
      cliente: "BLUE HOME INMOBILIARIA",
      Fecha: fecha,
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: codigo,
      Descripcion: observacion,
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente",
    };

    await sheet.addRow(nuevaOrden);
    console.log("✅ Orden creada correctamente:", nuevaOrden);
    res.status(201).json({ message: "Orden creada correctamente", data: nuevaOrden });
  } catch (error) {
    console.error("❌ Error al crear orden:", error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

export default router;
