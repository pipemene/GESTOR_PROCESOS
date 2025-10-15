import express from "express";
import { getSheet, appendRow } from "../services/sheetsService.js";

const router = express.Router();

// 🟦 Obtener todas las órdenes desde Google Sheets
router.get("/", async (req, res) => {
  try {
    const { headers, rows } = await getSheet();

    if (!rows || rows.length === 0) {
      console.warn("⚠️ No hay órdenes registradas.");
      return res.json([]);
    }

    console.log("✅ Órdenes cargadas correctamente:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("❌ Error al obtener órdenes:", error);
    res.status(500).json({ error: "Error al obtener las órdenes" });
  }
});

// 🟩 Crear una nueva orden
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    const nuevaFila = [
      "BLUE HOME INMOBILIARIA",
      new Date().toLocaleString("es-CO"),
      arrendatario || "Sin nombre",
      telefono || "",
      codigo || "",
      observacion || "",
      tecnico || "Sin asignar",
      "Pendiente",
    ];

    await appendRow("Órdenes", nuevaFila);
    console.log("✅ Orden creada correctamente:", nuevaFila);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error al crear la orden:", error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// 🟨 Obtener una orden específica por ID o código
router.get("/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { rows } = await getSheet();

    const orden = rows.find(
      (o) => o["Código"]?.toString().trim() === codigo.toString().trim()
    );

    if (!orden) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    res.json(orden);
  } catch (error) {
    console.error("❌ Error al obtener orden individual:", error);
    res.status(500).json({ error: "Error al buscar la orden" });
  }
});

export default router;
