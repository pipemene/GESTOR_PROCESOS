// ======================================================
// 🧾 Blue Home Gestor — Rutas de Órdenes (PDF automático)
// ======================================================
import express from "express";
import multer from "multer";
import fs from "fs";
import {
  getSheetData,
  appendRow,
  updateCell,
  getExcelColumnName,
} from "../services/sheetsService.js";
import { uploadFileToDrive, ensureFolderExists } from "../services/driveService.js";
import { generarPDFOrden } from "../services/pdfService.js";

const router = express.Router();
const SHEET_NAME = "ordenes";
const upload = multer({ dest: "/tmp" });

// ======================================================
// 🔧 Utilidades internas
// ======================================================
const normalizeKey = (text = "") =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES = {
  codigo: ["codigo", "codigoinmueble", "codigodelinmueble"],
  cliente: ["cliente", "arrendatario", "inquilino", "nombreinquilino", "nombrearrendatario", "nombre"],
  telefono: ["telefono", "tel", "celular", "contacto", "telefonoarrendatario", "telefonocliente"],
  tecnico: ["tecnico", "tecnicoasignado", "responsable"],
  estado: ["estado", "estatus"],
  descripcion: [
    "descripcion",
    "reporte",
    "descripcionreporte",
    "detallereporte",
    "observacion",
  ],
  fecha: ["fecha", "fechacreacion", "fecharegistro", "fechadecreacion"],
  materiales: ["materiales", "materialesutilizados"],
  observaciones: ["observaciones", "comentarios", "nota", "notas", "observacion"],
};

const HEADER_LOOKUP = Object.entries(HEADER_ALIASES).reduce((acc, [canonical, aliases]) => {
  aliases.forEach((alias) => {
    acc[alias] = canonical;
  });
  return acc;
}, {});

const buildRowObject = (headers = [], row = []) => {
  const data = {};

  headers.forEach((header, idx) => {
    const rawKey = header?.toString().trim();
    const value = row[idx] ?? "";

    if (rawKey) data[rawKey] = value;

    const normalized = normalizeKey(rawKey || "");
    if (normalized) data[normalized] = value;

    const canonical = HEADER_LOOKUP[normalized];
    if (canonical) data[canonical] = value;
  });

  return data;
};

const mapBodyToRow = (headers = [], body = {}) => {
  return headers.map((header) => {
    const rawKey = header?.toString().trim();
    const normalized = normalizeKey(rawKey || "");
    const canonical = HEADER_LOOKUP[normalized];

    if (canonical && body[canonical] !== undefined && body[canonical] !== null) {
      return body[canonical];
    }

    if (normalized && body[normalized] !== undefined && body[normalized] !== null) {
      return body[normalized];
    }

    if (rawKey && body[rawKey] !== undefined && body[rawKey] !== null) {
      return body[rawKey];
    }

    return "";
  });
};

const REQUIRED_FIELDS = ["codigo", "cliente", "telefono", "descripcion", "estado", "fecha"];

const canonicalizePayload = (payload = {}) => {
  const body = { ...payload };

  Object.entries(payload || {}).forEach(([key, value]) => {
    const normalized = normalizeKey(key || "");
    if (normalized && body[normalized] === undefined) {
      body[normalized] = value;
    }

    const canonical = HEADER_LOOKUP[normalized];
    if (canonical && body[canonical] === undefined) {
      body[canonical] = value;
    }
  });

  return body;
};

const ensureRequiredFields = (rawBody = {}) => {
  const body = canonicalizePayload(rawBody);
  const missing = REQUIRED_FIELDS.filter((field) => !body[field] || !`${body[field]}`.trim());
  if (missing.length) {
    const error = new Error(`Faltan campos obligatorios: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
};

const findRowNumberByCodigo = (rows = [], headers = [], codigo = "") => {
  if (!codigo) return -1;

  const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h || ""));
  if (idxCodigo < 0) return -1;

  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i]?.[idxCodigo];
    if ((cell || "").trim().toLowerCase() === codigo.trim().toLowerCase()) {
      return i + 1; // Google Sheets usa índice 1-based
    }
  }

  return -1;
};

/* ======================================================
   🔹 GET: listar órdenes desde Google Sheets
====================================================== */
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData(SHEET_NAME);
    if (!rows || rows.length <= 1) {
      return res.json([]);
    }

    const headers = rows[0];
    const data = rows
      .slice(1)
      .filter((row) => row.some((cell) => (cell || "").toString().trim() !== ""))
      .map((row) => buildRowObject(headers, row));

    res.json(data);
  } catch (e) {
    console.error("❌ Error al listar órdenes:", e);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

/* ======================================================
   🔹 POST: crear nueva orden en la hoja
====================================================== */
router.post("/", async (req, res) => {
  try {
    const body = canonicalizePayload({ ...req.body });
    if (!body.fecha) {
      body.fecha = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
    }
    if (!body.estado) {
      body.estado = "Pendiente";
    }
    if (!body.descripcion && body.observaciones) {
      body.descripcion = body.observaciones;
    }
    if (!body.observaciones && body.descripcion) {
      body.observaciones = body.descripcion;
    }

    ensureRequiredFields(body);

    const rows = await getSheetData(SHEET_NAME);
    const headers = rows?.[0] || [];

    if (!headers.length) {
      return res.status(500).json({ error: "La hoja de órdenes no tiene encabezados." });
    }

    const rowData = mapBodyToRow(headers, body);
    await appendRow(SHEET_NAME, rowData);

    console.log("✅ Nueva orden registrada en Google Sheets");
    res.json({ ok: true, message: "Orden creada correctamente" });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message || "Error al crear orden" });
  }
});

/* ======================================================
   🔹 POST: generar y subir PDF de orden
====================================================== */
router.post("/:codigo/pdf", upload.fields([
  { name: "fotoAntes" },
  { name: "fotoDespues" },
  { name: "firma" },
]), async (req, res) => {
  try {
    const { codigo } = req.params;
    const { cliente, telefono, tecnico, estado, descripcion, materiales, observaciones } = req.body;

    // Rutas temporales para fotos
    const fotoAntes = req.files["fotoAntes"]?.[0]?.path || null;
    const fotoDespues = req.files["fotoDespues"]?.[0]?.path || null;
    const firmaData = req.body.firma || null;

    console.log(`🧾 Generando PDF para orden ${codigo}...`);

    // Generar el PDF
    const pdfPath = await generarPDFOrden({
      codigo,
      cliente,
      telefono,
      tecnico,
      estado,
      descripcion,
      materiales,
      observaciones,
      firmaData,
      fotoAntes,
      fotoDespues,
    });

    // Subir el PDF al Drive
    await ensureFolderExists("BlueHome_Gestor_PDFs");
    const driveFile = await uploadFileToDrive(pdfPath, `Orden_${codigo}.pdf`, "BlueHome_Gestor_PDFs");

    // Eliminar archivos temporales
    if (fotoAntes && fs.existsSync(fotoAntes)) fs.unlinkSync(fotoAntes);
    if (fotoDespues && fs.existsSync(fotoDespues)) fs.unlinkSync(fotoDespues);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    // Actualizar hoja Google con enlace PDF
    const rows = await getSheetData(SHEET_NAME);
    if (!rows?.length) {
      return res.status(404).json({ error: "No se encontraron datos en la hoja." });
    }

    const headers = rows[0] || [];
    const idxPdf = headers.findIndex((h) => /pdf/i.test(h || ""));
    if (idxPdf < 0) {
      return res
        .status(500)
        .json({ error: "No se encontró la columna para guardar el enlace del PDF." });
    }

    const rowNumber = findRowNumberByCodigo(rows, headers, codigo);
    if (rowNumber < 0) {
      return res.status(404).json({ error: `No se encontró la orden ${codigo}.` });
    }

    const column = getExcelColumnName(idxPdf);
    await updateCell(SHEET_NAME, `${column}${rowNumber}`, driveFile.webViewLink);

    console.log(`✅ PDF de la orden ${codigo} subido correctamente a Drive`);
    res.json({ ok: true, driveUrl: driveFile.webViewLink });
  } catch (e) {
    console.error("❌ Error generando o subiendo el PDF:", e);
    res.status(500).json({ error: "Error generando o subiendo el PDF" });
  }
});

/* ======================================================
   🔹 PATCH/POST: finalizar orden (marca como Finalizada)
====================================================== */
const finishOrderHandler = async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    if (!rows?.length) {
      return res.status(404).json({ error: "No se encontraron datos en la hoja." });
    }

    const headers = rows[0] || [];
    const idxEstado = headers.findIndex((h) => /estado/i.test(h || ""));
    const rowNumber = findRowNumberByCodigo(rows, headers, codigo);

    if (rowNumber < 0) return res.status(404).json({ error: "Orden no encontrada" });
    if (idxEstado < 0)
      return res.status(500).json({ error: "No se encontró la columna Estado en la hoja." });

    const column = getExcelColumnName(idxEstado);
    await updateCell(SHEET_NAME, `${column}${rowNumber}`, "Finalizada");

    console.log(`✅ Orden ${codigo} marcada como finalizada.`);
    res.json({ ok: true, message: "Orden finalizada correctamente." });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
};

router.patch("/:codigo/finish", finishOrderHandler);
router.post("/:codigo/finish", finishOrderHandler);

/* ======================================================
   🔹 PATCH: asignar orden a técnico
====================================================== */
router.patch("/:codigo/assign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const body = canonicalizePayload(req.body || {});
    const tecnico = `${body.tecnico || ""}`.trim();

    if (!tecnico) {
      return res.status(400).json({ error: "Debe indicar el nombre del técnico." });
    }

    const rows = await getSheetData(SHEET_NAME);
    if (!rows?.length) {
      return res.status(404).json({ error: "No se encontraron datos en la hoja." });
    }

    const headers = rows[0] || [];
    const idxTecnico = headers.findIndex((h) => /t(é|e)cnico/i.test(h || ""));
    const idxEstado = headers.findIndex((h) => /estado/i.test(h || ""));
    const rowNumber = findRowNumberByCodigo(rows, headers, codigo);

    if (rowNumber < 0) return res.status(404).json({ error: "Orden no encontrada" });
    if (idxTecnico < 0)
      return res.status(500).json({ error: "No se encontró la columna Técnico en la hoja." });

    const tecnicoColumn = getExcelColumnName(idxTecnico);
    await updateCell(SHEET_NAME, `${tecnicoColumn}${rowNumber}`, tecnico);

    if (idxEstado >= 0) {
      const estadoColumn = getExcelColumnName(idxEstado);
      await updateCell(SHEET_NAME, `${estadoColumn}${rowNumber}`, "Asignada");
    }

    console.log(`✅ Orden ${codigo} asignada al técnico ${tecnico}.`);
    res.json({ ok: true, message: "Orden asignada correctamente." });
  } catch (e) {
    console.error("❌ Error al asignar orden:", e);
    res.status(500).json({ error: "Error al asignar orden" });
  }
});

export { router };
