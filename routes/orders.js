import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  SPREADSHEET_ID,
  ORDERS_SHEET,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} from "../config.js";

const router = express.Router();

// 🟦 Crear nueva orden
router.post("/", async (req, res) => {
  try {
    const { codigoInmueble, arrendatario, telefono, tecnico, observacion } = req.body;
    console.log("📦 Nueva orden:", req.body);

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) return res.status(500).json({ error: "Hoja no encontrada" });

    // Agregar nueva fila
    await sheet.addRow({
      Cliente: "BLUE HOME INMOBILIARIA",
      Fecha: new Date().toLocaleString("es-CO"),
      Inquilino: arrendatario || "",
      Telefono: telefono || "",
      Código: codigoInmueble || "",
      Descripcion: observacion || "",
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente",
    });

    console.log("✅ Orden registrada correctamente");
    res.json({ message: "Orden creada correctamente" });
  } catch (error) {
    console.error("🔥 Error al crear orden:", error.message);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// 🟨 Obtener todas las órdenes
router.get("/", async (req, res) => {
  try {
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    const rows = await sheet.getRows();

    const data = rows.map((row) => ({
      codigo: row["Código"] || "",
      arrendatario: row["Inquilino"] || "",
      telefono: row["Telefono"] || "",
      tecnico: row["Tecnico"] || "",
      observacion: row["Descripcion"] || "",
      estado: row["Estado"] || "",
      fecha: row["Fecha"] || "",
    }));

    res.json(data);
  } catch (error) {
    console.error("🔥 Error al obtener órdenes:", error.message);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

export default router;
