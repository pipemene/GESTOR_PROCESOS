// ======================================================
// 🧾 Blue Home Gestor — Rutas de Órdenes (PDF automático)
// ======================================================
import express from "express";
import multer from "multer";
import fs from "fs";
import { getSheetData, appendRow, updateCell } from "../services/sheetsService.js";
import { uploadFileToDrive, ensureFolderExists } from "../services/driveService.js";
import { generarPDFOrden } from "../services/pdfService.js";

const router = express.Router();
const SHEET_NAME = "ordenes";
const upload = multer({ dest: "/tmp" });

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
    const folderId = await ensureFolderExists("BlueHome_Gestor_PDFs");
    const driveFile = await uploadFileToDrive(pdfPath, `Orden_${codigo}.pdf`, "BlueHome_Gestor_PDFs");

    // Eliminar archivos temporales
    if (fotoAntes && fs.existsSync(fotoAntes)) fs.unlinkSync(fotoAntes);
    if (fotoDespues && fs.existsSync(fotoDespues)) fs.unlinkSync(fotoDespues);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    // Actualizar hoja Google con enlace PDF
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    const idxPdf = headers.findIndex((h) => /pdf/i.test(h));

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > 0 && idxPdf >= 0) {
      const letra = String.fromCharCode("A".charCodeAt(0) + idxPdf);
      await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, driveFile.webViewLink);
    }

    console.log(`✅ PDF de la orden ${codigo} subido correctamente a Drive`);
    res.json({ ok: true, driveUrl: driveFile.webViewLink });
  } catch (e) {
    console.error("❌ Error generando o subiendo el PDF:", e);
    res.status(500).json({ error: "Error generando o subiendo el PDF" });
  }
});

/* ======================================================
   🔹 PATCH: finalizar orden (marca como Finalizada)
====================================================== */
router.patch("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    const rows = await getSheetData(SHEET_NAME);
    const headers = rows[0];
    const idxCodigo = headers.findIndex((h) => /c(ó|o)digo/i.test(h));
    const idxEstado = headers.findIndex((h) => /estado/i.test(h));

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idxCodigo] || "").trim().toLowerCase() === codigo.toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex < 0) return res.status(404).json({ error: "Orden no encontrada" });

    // Cambiar estado a “Finalizada”
    const letraEstado = String.fromCharCode("A".charCodeAt(0) + idxEstado);
    await updateCell(SHEET_NAME, `${SHEET_NAME}!${letraEstado}${rowIndex}`, "Finalizada");

    console.log(`✅ Orden ${codigo} marcada como finalizada.`);
    res.json({ ok: true, message: "Orden finalizada correctamente." });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "Error al finalizar orden" });
  }
});

export { router };
