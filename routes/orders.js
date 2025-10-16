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
import { sendEmail } from "../services/mailService.js";

export const router = express.Router();
const upload = multer(); // para manejar fotos (antes/después)

// ======================================================
// 🔹 GET /api/orders → Listar órdenes desde Google Sheets
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
// 🔹 POST /api/orders → Crear nueva orden
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

// ======================================================
// 🔹 Utilidad → Buscar fila por código
// ======================================================
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
// 🔹 PATCH /api/orders/:codigo/assign → Asignar técnico
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
// 🔹 POST /api/orders/:codigo/upload-photo → Foto antes/después
// ======================================================
router.post("/:codigo/upload-photo", upload.single("file"), async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = (req.body.tipo || "").toLowerCase();
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
    if (!["antes", "despues"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });

    const url = await uploadFileBufferToDrive(req.file, `${tipo}_${Date.now()}.jpg`, codigo);

    const found = await findRowByCode(codigo);
    if (found) {
      const colName = tipo === "antes" ? /foto.?antes/i : /foto.?despues/i;
      const colIdx = found.headers.findIndex(h => colName.test(h));
      if (colIdx >= 0) {
        const letter = String.fromCharCode("A".charCodeAt(0) + colIdx);
        await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, url);
      }
    }

    res.json({ ok: true, url });
  } catch (e) {
    console.error("❌ Error al subir foto:", e);
    res.status(500).json({ error: "upload-photo failed" });
  }
});

// ======================================================
// 🔹 POST /api/orders/:codigo/feedback → Materiales y trabajo
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
// 🔹 POST /api/orders/:codigo/sign → Firma del inquilino
// ======================================================
router.post("/:codigo/sign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { firmaInquilino } = req.body;
    if (!firmaInquilino) return res.status(400).json({ error: "Firma requerida" });

    const url = await uploadBase64ImageToDrive(firmaInquilino, `firma_inquilino_${Date.now()}`, codigo);

    const found = await findRowByCode(codigo);
    if (found) {
      const idxFirma = found.headers.findIndex(h => /firma$/i.test(h));
      if (idxFirma >= 0) {
        const letter = String.fromCharCode("A".charCodeAt(0) + idxFirma);
        await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, url);
      }
    }

    res.json({ ok: true, url });
  } catch (e) {
    console.error("❌ Error al subir firma:", e);
    res.status(500).json({ error: "sign failed" });
  }
});

// ======================================================
// 🔹 POST /api/orders/:codigo/finish → Finalizar (PDF + correo + descarga)
// ======================================================
router.post("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    // 1️⃣ Actualizar estado
    const idxEstado = found.headers.findIndex(h => /estado/i.test(h));
    if (idxEstado >= 0) {
      const letter = String.fromCharCode("A".charCodeAt(0) + idxEstado);
      await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, "Finalizada");
    }

    // 2️⃣ Generar PDF temporal
    const pdfPath = await generateOrderPDF(codigo);

    // 3️⃣ Subir PDF a Drive
    const { webViewLink } = await uploadPDFToDrive(pdfPath, codigo);

    // 4️⃣ Enviar correo con PDF
    await sendEmail({
      to: "reparaciones@bluehomeinmo.co",
      subject: `Orden finalizada ${codigo}`,
      html: `
        <p>Hola equipo,</p>
        <p>La orden <b>${codigo}</b> ha sido finalizada.</p>
        <p>📎 <a href="${webViewLink}" target="_blank">Descargar PDF</a></p>
        <p>— Blue Home Gestor</p>
      `,
      attachments: [
        {
          filename: `Orden_${codigo}.pdf`,
          path: pdfPath,
          contentType: "application/pdf"
        }
      ]
    });

    // 5️⃣ Eliminar PDF temporal
    try { fs.unlinkSync(pdfPath); } catch {}

    // 6️⃣ Devolver link de descarga directa
    const directDownload = webViewLink.replace("/view?usp=drivesdk", "/export?format=pdf");

    res.json({
      ok: true,
      message: "Orden finalizada con éxito.",
      pdfLink: webViewLink,
      download: directDownload
    });
  } catch (e) {
    console.error("❌ Error al finalizar orden:", e);
    res.status(500).json({ error: "finish failed" });
  }
});

export default router;
