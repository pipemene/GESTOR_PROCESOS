import express from "express";
import multer from "multer";
import { getSheetData, updateCell, appendRow } from "../services/sheetsService.js";
import {
  uploadBase64ImageToDrive,
  uploadFileBufferToDrive,
  ensureOrderFolder
} from "../services/driveService.js";

export const router = express.Router(); // 🔥 export nombrado, no default
const upload = multer(); // memoria (buffer)

// 🔹 GET /api/orders → Listar órdenes desde Google Sheets
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
    console.error("❌ Error al obtener órdenes desde Google Sheets:", error);
    res.status(500).json({ error: "Error al cargar las órdenes" });
  }
});

// 🔹 Utilidad interna: busca fila por código
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

// 🔹 PATCH /api/orders/:codigo/assign → asignar técnico
router.patch("/:codigo/assign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { tecnico } = req.body;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    const idxTec = found.headers.findIndex(h => /t[ée]cnico/i.test(h));
    if (idxTec < 0) return res.status(400).json({ error: "No existe columna Técnico" });

    const colLetter = String.fromCharCode("A".charCodeAt(0) + idxTec);
    await updateCell("Órdenes", `Órdenes!${colLetter}${found.rowIndex}`, tecnico || "Sin asignar");

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Assign failed" });
  }
});

// 🔹 POST /api/orders/:codigo/upload-photo → subir foto antes/después
router.post("/:codigo/upload-photo", upload.single("file"), async (req, res) => {
  try {
    const { codigo } = req.params;
    const tipo = (req.body.tipo || "").toLowerCase();
    if (!req.file) return res.status(400).json({ error: "Archivo requerido" });
    if (!["antes", "despues"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });

    const folderId = await ensureOrderFolder(codigo);
    const url = await uploadFileBufferToDrive({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype || "image/jpeg",
      filename: `${tipo}_${Date.now()}.jpg`,
      folderId
    });

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
    console.error(e);
    res.status(500).json({ error: "upload-photo failed" });
  }
});

// 🔹 POST /api/orders/:codigo/feedback → materiales y trabajo realizado
router.post("/:codigo/feedback", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { materiales = "", trabajo = "", fotoAntesURL = null, fotoDespuesURL = null } = req.body;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    const idxMat = found.headers.findIndex(h => /material(es)?/i.test(h));
    const idxTrab = found.headers.findIndex(h => /trabajo/i.test(h));
    const idxFA = found.headers.findIndex(h => /foto.?antes/i.test(h));
    const idxFD = found.headers.findIndex(h => /foto.?despues/i.test(h));

    const setCell = async (idx, value) => {
      if (idx < 0) return;
      const letter = String.fromCharCode("A".charCodeAt(0) + idx);
      await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, value);
    };

    await setCell(idxMat, materiales);
    await setCell(idxTrab, trabajo);
    if (fotoAntesURL) await setCell(idxFA, fotoAntesURL);
    if (fotoDespuesURL) await setCell(idxFD, fotoDespuesURL);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "feedback failed" });
  }
});

// 🔹 POST /api/orders/:codigo/sign → firma del inquilino (base64)
router.post("/:codigo/sign", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { firmaInquilino } = req.body;
    if (!firmaInquilino) return res.status(400).json({ error: "Firma requerida" });

    const folderId = await ensureOrderFolder(codigo);
    const url = await uploadBase64ImageToDrive({
      dataUrl: firmaInquilino,
      filename: `firma_inquilino_${Date.now()}.png`,
      folderId
    });

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
    console.error(e);
    res.status(500).json({ error: "sign failed" });
  }
});

// 🔹 POST /api/orders/:codigo/finish → marcar finalizada
router.post("/:codigo/finish", async (req, res) => {
  try {
    const { codigo } = req.params;
    const found = await findRowByCode(codigo);
    if (!found) return res.status(404).json({ error: "Orden no encontrada" });

    const idxEstado = found.headers.findIndex(h => /estado/i.test(h));
    if (idxEstado >= 0) {
      const letter = String.fromCharCode("A".charCodeAt(0) + idxEstado);
      await updateCell("Órdenes", `Órdenes!${letter}${found.rowIndex}`, "Finalizada");
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "finish failed" });
  }
});
