import express from "express";
import multer from "multer";
import fs from "fs";
import { getSheetData, updateCell, appendRow } from "../services/sheetsService.js";
import {
  uploadBase64ImageToDrive,
  uploadFileBufferToDrive,
  ensureOrderFolder,
  uploadPDFToDrive
} from "../services/driveService.js";
import { generateOrderPDF } from "../services/pdfService.js";
// Si el correo está temporalmente apagado, puedes comentar esta línea
import { sendEmail } from "../services/mailService.js";

export const router = express.Router();
const upload = multer();

// ======================================================
// GET /api/orders
// ======================================================
router.get("/", async (req, res) => {
  try {
    const rows = await getSheetData("Órdenes");
    if (!rows || rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => (obj[h] = row[j] || ""));
      obj.id = i + 1;
      return obj;
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Error al obtener órdenes:", error);
    res.status(500).json({ error: "Error al cargar las órdenes" });
  }
});

// ======================================================
// POST /api/orders
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { codigo, arrendatario, telefono, tecnico, descripcion, observacion } = req.body;
    const descripcionFinal = descripcion || observacion || "";

    if (!codigo || !arrendatario || !telefono || !descripcionFinal) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const estado = "Pendiente";
    const nuevaFila = [
      codigo,
      arrendatario,
      telefono,
      tecnico || "Sin asignar",
      estado,
      descripcionFinal
    ];

    await appendRow("Órdenes", nuevaFila);
    console.log(`✅ Nueva orden creada correctamente (${codigo})`);

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al crear orden:", e);
    res.status(500).json({ error: "Error al crear la orden" });
  }
});

// Utilidad para ubicar la fila por código
async function findRowByCode(codigo) {
  const rows = await getSheetData("Órdenes");
  const headers = rows[0] || [];
  const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
  if (idxCodigo < 0) throw new Error("No existe columna Código");

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idxCodigo] || "").toString().trim() === codigo.toString().trim()) {
      return { rowIndex: i + 1, headers, row: rows[i] };
    }
  }
  return null;
}

// ======================================================
// PATCH /api/orders/:codigo/assign
// ======================================================
router.patch("/:codigo/assign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { tecnico } = req.body;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    const idxTec = found.headers.findIndex(h => /t[ée]cnico/i.test(h));
    const colLetter = String.fromCharCode("A".charCodeAt(0) + idxTec);
    await updateCell("Órdenes", `Órdenes!${colLetter}${found.rowIndex}`, tecnico || "Sin asignar");

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error al asignar técnico:", e);
    res.status(500).json({ error: "Assign failed" });
  }
});

// ======================================================
// POST /api/orders/:codigo/upload-photo
// ======================================================
router.post("/:codigo/upload-photo", upload.single("file"), async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = (req.body.tipo || "").toLowerCase();
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
    if (!["antes", "despues"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });

    const { viewLink } = await uploadFileBufferToDrive(req.file, `${tipo}_${Date.now()}.jpg`, codigo);

    // Guardar SOLO la URL (texto) en Sheets
    const found = await findRowByCode(codigo);
    if (found) {
      const colName = tipo === "antes" ? /foto.?antes/i : /foto.?despues/i;
      const colIdx = found.headers.findIndex(h => colName.test(h));
      if (colIdx >= 0) {
        const letter = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, viewLink);
      }
    }

    res.json({ ok: true, url: viewLink });
  } catch (e) {
    console.error("❌ Error al subir foto:", e);
    res.status(500).json({ error: "upload-photo failed" });
  }
});

// ======================================================
// POST /api/orders/:codigo/feedback
// ======================================================
router.post("/:codigo/feedback", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { materiales = "", trabajo = "" } = req.body;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    const idxMat = found.headers.findIndex(h => /material(es)?/i.test(h));
    const idxTrab = found.headers.findIndex(h => /trabajo/i.test(h));

    const setCell = async (idx, value) => {
      if (idx < 0) return;
      const letter = String.fromCharCode("A".charCodeAt(0) + idx);
      await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, value);
    };

    await setCell(idxMat, materiales);
    await setCell(idxTrab, trabajo);

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Error en feedback:", e);
    res.status(500).json({ error: "feedback failed" });
  }
});

// ======================================================
// POST /api/orders/:codigo/sign
// ======================================================
router.post("/:codigo/sign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { firmaInquilino } = req.body;
    if (!firmaInquilino) return res.status(400).json({ error: "Firma requerida" });

    const { viewLink } = await uploadBase64ImageToDrive(
      firmaInquilino,
      `firma_inquilino_${Date.now()}`,
      codigo
    );

    const found = await findRowByCode(codigo);
    if (found) {
      const idxFirma = found.headers.findIndex(h => /firma$/i.test(h));
      if (idxFirma >= 0) {
        const letter = String.fromCharCode("A".charCodeAt(0) + idxFirma);
        await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, viewLink); // <-- solo TEXTO
      }
    }

    res.json({ ok: true, url: viewLink });
  } catch (e) {
    console.error("❌ Error al subir firma:", e);
    res.status(500).json({ error: "sign failed" });
  }
});

// ======================================================
// POST /api/orders/:codigo/finish
// ======================================================
router.post("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🚀 Finalizando orden ${codigo}...`);

    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    // Estado = Finalizada
    const idxEstado = found.headers.findIndex(h => /estado/i.test(h));
    if (idxEstado >= 0) {
      const letter = String.fromCharCode("A".charCodeAt(0) + idxEstado);
      await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, "Finalizada");
    }

    // Generar PDF y subir
    console.log("🧾 Generando PDF técnico...");
    const pdfPath = await generateOrderPDF(codigo);
    const { viewLink, downloadLink } = await uploadPDFToDrive(pdfPath, codigo);
    console.log("✅ PDF subido correctamente:", viewLink);

    // (Opcional) correo — si está activo
    // await sendEmail({ ... });

    try { fs.unlinkSync(pdfPath); } catch {}

    // Responder usando claves ya calculadas (sin replace)
    return res.json({
      ok: true,
      message: "Orden finalizada con éxito.",
      pdfView: viewLink,
      pdfDownload: downloadLink
    });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "finish failed" });
  }
});

export default router;
