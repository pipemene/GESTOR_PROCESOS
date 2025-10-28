// ======================================================
// 🧾 Blue Home Gestor — Rutas de Órdenes (PDF automático)
// ======================================================
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  getSheetData,
  appendRow,
  updateCell,
  getExcelColumnName,
} from "../services/sheetsService.js";
import { uploadFileToDrive, ensureFolderExists } from "../services/driveService.js";
import { generarPDFOrden } from "../services/pdfService.js";
import { sendMail } from "../services/mailService.js";

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
  materiales: ["materiales", "materialesutilizados", "insumos"],
  observaciones: ["observaciones", "comentarios", "nota", "notas", "observacion"],
  fotobefore: ["fotoantes", "evidenciaantes", "foto antes"],
  fotoafter: ["fotodespues", "evidenciadespues", "foto despues", "fotodespués"],
  pdf: ["pdf", "enlacepdf", "linkpdf", "urlpdf"],
  firmante: ["firmante", "nombrefirmante", "quienfirma", "firmadoportecnico"],
  firma: ["firma", "firmaurl", "evidenciafirma"],
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

const updateColumnIfExists = async (headers = [], rowNumber, regex, value) => {
  if (!headers?.length || !regex) return false;
  const idx = headers.findIndex((header) => regex.test(header || ""));
  if (idx < 0) return false;

  const column = getExcelColumnName(idx);
  await updateCell(SHEET_NAME, `${column}${rowNumber}`, value ?? "");
  return true;
};

const parseNotificationRecipients = () => {
  const raw =
    process.env.DAYAN_EMAILS ||
    process.env.DAYAN_EMAIL ||
    process.env.NOTIFY_DAYAN_EMAIL ||
    "";

  return raw
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
router.post(
  "/:codigo/pdf",
  upload.fields([
    { name: "fotoAntes" },
    { name: "fotoDespues" },
    { name: "firma" },
  ]),
  async (req, res) => {
    try {
      const { codigo } = req.params;
      const {
        cliente,
        telefono,
        tecnico,
        estado,
        descripcion,
        materiales,
        observaciones,
        nombreFirmante,
      } = req.body;

      const fotoAntesFile = req.files["fotoAntes"]?.[0] || null;
      const fotoDespuesFile = req.files["fotoDespues"]?.[0] || null;
      const fotoAntes = fotoAntesFile?.path || null;
      const fotoDespues = fotoDespuesFile?.path || null;
      const firmaData = req.body.firma || null;
      const materialesTexto = `${materiales || ""}`.trim();
      const observacionesTexto = `${observaciones || ""}`.trim();
      const firmanteNombre = `${nombreFirmante || ""}`.trim();

      console.log(`🧾 Generando PDF para orden ${codigo}...`);

      const pdfPath = await generarPDFOrden({
        codigo,
        cliente,
        telefono,
        tecnico,
        estado: estado || "Finalizada",
        descripcion,
        materiales: materialesTexto,
        observaciones: observacionesTexto,
        firmaData,
        fotoAntes,
        fotoDespues,
        firmante: firmanteNombre,
      });

      const evidenciasRootId = await ensureFolderExists("BlueHome_Gestor_Ordenes");
      const orderFolderId = await ensureFolderExists(`Orden_${codigo}`, evidenciasRootId);
      const uploads = {};

      if (fotoAntes && fs.existsSync(fotoAntes)) {
        const ext = path.extname(fotoAntesFile?.originalname || "") || ".jpg";
        const mime = fotoAntesFile?.mimetype || "image/jpeg";
        const driveFotoAntes = await uploadFileToDrive(
          fotoAntes,
          `Orden_${codigo}_antes${ext}`,
          orderFolderId,
          { mimeType: mime, isFolderId: true }
        );
        uploads.fotoAntes = driveFotoAntes.webViewLink;
      }

      if (fotoDespues && fs.existsSync(fotoDespues)) {
        const ext = path.extname(fotoDespuesFile?.originalname || "") || ".jpg";
        const mime = fotoDespuesFile?.mimetype || "image/jpeg";
        const driveFotoDespues = await uploadFileToDrive(
          fotoDespues,
          `Orden_${codigo}_despues${ext}`,
          orderFolderId,
          { mimeType: mime, isFolderId: true }
        );
        uploads.fotoDespues = driveFotoDespues.webViewLink;
      }

      let firmaTemporalPath = null;
      if (firmaData) {
        const base64Image = firmaData.replace(/^data:image\/[a-zA-Z+]+;base64,?/, "");
        firmaTemporalPath = path.join("/tmp", `firma_${codigo}_${Date.now()}.png`);
        fs.writeFileSync(firmaTemporalPath, base64Image, "base64");
        const driveFirma = await uploadFileToDrive(
          firmaTemporalPath,
          `Orden_${codigo}_firma.png`,
          orderFolderId,
          { mimeType: "image/png", isFolderId: true }
        );
        uploads.firma = driveFirma.webViewLink;
      }

      const drivePdf = await uploadFileToDrive(
        pdfPath,
        `Orden_${codigo}.pdf`,
        orderFolderId,
        { mimeType: "application/pdf", isFolderId: true }
      );

      // Copia de seguridad en carpeta histórica (mantiene compatibilidad con flujos anteriores)
      try {
        await uploadFileToDrive(pdfPath, `Orden_${codigo}.pdf`, "BlueHome_Gestor_PDFs", {
          mimeType: "application/pdf",
        });
      } catch (backupErr) {
        console.warn("⚠️ No se pudo crear la copia del PDF en la carpeta histórica:", backupErr);
      }

      const rows = await getSheetData(SHEET_NAME);
      if (!rows?.length) {
        return res.status(404).json({ error: "No se encontraron datos en la hoja." });
      }

      const headers = rows[0] || [];
      const rowNumber = findRowNumberByCodigo(rows, headers, codigo);
      if (rowNumber < 0) {
        return res.status(404).json({ error: `No se encontró la orden ${codigo}.` });
      }

      const finalEstado = "Finalizada";
      const updateTasks = [
        updateColumnIfExists(headers, rowNumber, /pdf/i, drivePdf.webViewLink),
        updateColumnIfExists(headers, rowNumber, /estado/i, finalEstado),
      ];

      if (firmanteNombre) {
        updateTasks.push(
          updateColumnIfExists(headers, rowNumber, /(firmante|quien\s*firma)/i, firmanteNombre)
        );
      }

      if (materialesTexto) {
        updateTasks.push(updateColumnIfExists(headers, rowNumber, /material/i, materialesTexto));
      }
      if (observacionesTexto) {
        updateTasks.push(updateColumnIfExists(headers, rowNumber, /observ/i, observacionesTexto));
      }

      if (uploads.fotoAntes) {
        updateTasks.push(updateColumnIfExists(headers, rowNumber, /(foto|evidencia).*antes/i, uploads.fotoAntes));
      }
      if (uploads.fotoDespues) {
        updateTasks.push(updateColumnIfExists(headers, rowNumber, /(foto|evidencia).*despu(é|e)s/i, uploads.fotoDespues));
      }
      if (uploads.firma) {
        updateTasks.push(updateColumnIfExists(headers, rowNumber, /firma/i, uploads.firma));
      }

      await Promise.all(updateTasks);

      if (fotoAntes && fs.existsSync(fotoAntes)) fs.unlinkSync(fotoAntes);
      if (fotoDespues && fs.existsSync(fotoDespues)) fs.unlinkSync(fotoDespues);
      if (firmaTemporalPath && fs.existsSync(firmaTemporalPath)) fs.unlinkSync(firmaTemporalPath);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

      let notified = false;
      const recipients = parseNotificationRecipients();
      if (recipients.length) {
        const subject = `Orden ${codigo} finalizada`;
        const linksList = [
          `<li><a href="${drivePdf.webViewLink}" target="_blank" rel="noopener">PDF generado</a></li>`,
        ];
        if (uploads.fotoAntes) {
          linksList.push(`<li><a href="${uploads.fotoAntes}" target="_blank" rel="noopener">Foto antes</a></li>`);
        }
        if (uploads.fotoDespues) {
          linksList.push(`<li><a href="${uploads.fotoDespues}" target="_blank" rel="noopener">Foto después</a></li>`);
        }
        if (uploads.firma) {
          linksList.push(`<li><a href="${uploads.firma}" target="_blank" rel="noopener">Firma registrada</a></li>`);
        }

        const html = `
          <p>Hola Dayan,</p>
          <p>La orden <strong>${codigo}</strong> ha sido finalizada.</p>
          <ul>
            <li><strong>Cliente:</strong> ${cliente || "-"}</li>
            <li><strong>Teléfono:</strong> ${telefono || "-"}</li>
            <li><strong>Técnico:</strong> ${tecnico || "-"}</li>
            <li><strong>Firmante:</strong> ${firmanteNombre || "-"}</li>
          </ul>
          <p>Materiales / trabajo realizado:</p>
          <p>${materialesTexto || "(sin descripción)"}</p>
          <p>Observaciones adicionales:</p>
          <p>${observacionesTexto || "(sin observaciones)"}</p>
          <p>Adjuntos:</p>
          <ul>${linksList.join("")}</ul>
          <p>Este mensaje fue generado automáticamente por el Gestor de Órdenes.</p>
        `;

        try {
          await sendMail(recipients.join(","), subject, html);
          notified = true;
        } catch (mailErr) {
          console.error("❌ Error al enviar notificación a Dayan:", mailErr);
        }
      }

      console.log(`✅ PDF de la orden ${codigo} subido correctamente a Drive`);
      res.json({
        ok: true,
        driveUrl: drivePdf.webViewLink,
        assets: uploads,
        notified,
        message: "Orden finalizada. Evidencias subidas y PDF generado correctamente.",
      });
    } catch (e) {
      console.error("❌ Error generando o subiendo el PDF:", e);
      const isConfigError = e.code === "E_MISSING_DRIVE_CONFIG";
      const message = isConfigError
        ? "No se pudo conectar con Google Drive. Verifica las credenciales configuradas."
        : "Error generando o subiendo el PDF";
      res.status(500).json({ error: message });
    }
  }
);

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
