import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  SPREADSHEET_ID,
  ORDERS_SHEET,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  JWT_SECRET,
} from "../config.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ✅ Middleware de autenticación
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token faltante" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token faltante" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ Error al verificar token:", err.message);
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// ✅ Crear nueva orden
router.post("/", verificarToken, async (req, res) => {
  try {
    console.log("📦 Datos recibidos para crear orden:", req.body);

    const { codigoInmueble, arrendatario, telefono, tecnico, observacion } =
      req.body;

    const rol = req.user.rol;
    console.log("👤 Rol del usuario:", rol);

    if (rol !== "SuperAdmin" && rol !== "admin") {
      return res
        .status(403)
        .json({ error: "Solo el SuperAdmin o admin puede crear órdenes" });
    }

    console.log("🧾 Conectando con Google Sheets...");

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });

    await doc.loadInfo();

    console.log("✅ Conectado a la hoja:", doc.title);

    const sheet = doc.sheetsByTitle[ORDERS_SHEET];
    if (!sheet) {
      console.error("❌ No se encontró la pestaña:", ORDERS_SHEET);
      return res.status(500).json({ error: "Hoja de órdenes no encontrada" });
    }

    console.log("✍️ Agregando nueva fila...");

    await sheet.addRow({
      Codigo: codigoInmueble,
      Arrendatario: arrendatario,
      Telefono: telefono,
      Tecnico: tecnico || "Sin asignar",
      Observacion: observacion,
      Estado: "Pendiente",
      FechaCreacion: new Date().toLocaleString("es-CO"),
    });

    console.log("✅ Orden creada correctamente en Google Sheets");

    res.json({ message: "Orden creada correctamente" });
  } catch (error) {
    console.error("🔥 ERROR INTERNO AL CREAR ORDEN:");
    console.error(error.message);
    console.error(error.stack);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// ✅ Obtener todas las órdenes
router.get("/", verificarToken, async (req, res) => {
  try {
    console.log("📥 Solicitando todas las órdenes...");

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
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
