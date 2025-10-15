import express from "express";
import { getSheet } from "../services/googleSheets.js";

const router = express.Router();

// ✅ Función auxiliar para limpiar nombres de columnas
function limpiarCampo(campo) {
  return campo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// 📋 Obtener todas las órdenes
router.get("/", async (req, res) => {
  try {
    const sheet = await getSheet();
    const rows = await sheet.getRows();

    if (!rows.length) return res.json([]);

    // 👇 Log de diagnóstico
    console.log("Encabezados detectados:", Object.keys(rows[0]));

    // 🔍 Normalizar encabezados
    const encabezados = Object.keys(rows[0]).reduce((mapa, clave) => {
      const limpio = limpiarCampo(clave);
      mapa[limpio] = clave;
      return mapa;
    }, {});

    // 🧩 Convertir filas en objetos orden
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

// 📌 Crear nueva orden
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, observacion } = req.body;

    if (!codigo || !arrendatario || !telefono) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    const sheet = await getSheet();
    const nuevaFila = {
      Cliente: "BLUE HOME INMOBILIARIA",
      Fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      Inquilino: arrendatario,
      Telefono: telefono,
      Código: codigo,
      Descripcion: observacion,
      Tecnico: tecnico || "Sin asignar",
      Estado: "Pendiente",
    };

    await sheet.addRow(nuevaFila);
    console.log("✅ Orden creada correctamente:", nuevaFila);
    res.status(201).json({ message: "Orden creada correctamente", orden: nuevaFila });
  } catch (error) {
    console.error("❌ Error al crear orden:", error);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

export default router;
