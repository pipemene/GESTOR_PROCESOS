import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  SPREADSHEET_ID,
  ORDERS_SHEET,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} from "../config.js";

const router = express.Router();

// ✅ Crear nueva orden (sin verificarToken temporalmente)
router.post("/", async (req, res) => {
  try {
    console.log("📦 Datos recibidos para crear orden:", req.body);

    const { codigoInmueble, arrendatario, telefono, tecnico, observacion } =
      req.body;

    console.log("🧾 Conectando con Google Sheets...");

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    // Autenticación con servicio de Google
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();
    console.log("✅ Conectado al documento:", doc.title);

    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) {
      console.error("❌ No se encontró la pestaña:", ORDERS_SHEET);
      return res.status(500).json({ error: "Hoja de órdenes no encontrada" });
    }

    console.log("✍️ Agregando nueva fila...");

    await sheet.addRow({
      Codigo: codigoInmueble || "",
      Arrendatario: arrendatario || "",
      Telefono: telefono || "",
      Tecnico: tecnico || "Sin asignar",
      Observacion: observacion || "",
      Estado: "Pendiente",
      FechaCreacion: new Date().toLocaleString("es-CO"),
    });

    console.log("✅ Orden creada correctamente en Google Sheets");

    res.json({ message: "Orden creada correctamente" });
  } catch (error) {
    console.error("🔥 ERROR AL CREAR ORDEN:");
    console.error(error.message);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// ✅ Obtener todas las órdenes (sin verificarToken temporalmente)
router.get("/", async (req, res) => {
  try {
    console.log("📥 Solicitando todas las órdenes...");

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[ORDERS_SHEET];

    if (!sheet) {
      console.error("❌ No se encontró la pestaña:", ORDERS_SHEET);
      return res.status(500).json({ error: "Hoja de órdenes no encontrada" });
    }

    const rows = await sheet.getRows();
    console.log(`📄 ${rows.length} órdenes encontradas`);

    const data = rows.map((row) => ({
      codigo: row.Codigo,
      arrendatario: row.Arrendatario,
      telefono: row.Telefono,
      tecnico: row.Tecnico,
      observacion: row.Observacion,
      estado: row.Estado,
      fecha: row.FechaCreacion,
    }));

    res.json(data);
  } catch (error) {
    console.error("🔥 ERROR AL OBTENER ÓRDENES:");
    console.error(error.message);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

export default router;
