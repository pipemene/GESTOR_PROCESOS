// services/pdfService.js
import fs from "fs";
import os from "os";
import path from "path";
import PDFDocument from "pdfkit";
import axios from "axios";
import { getSheetData } from "./sheetsService.js";

/**
 * Descarga una imagen remota a buffer (si la URL es pública).
 */
async function downloadImage(url) {
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(data);
  } catch {
    return null;
  }
}

/**
 * Busca la fila de una orden por código y devuelve { headers, row, rowIndex }
 */
async function findRowByCode(codigo) {
  const rows = await getSheetData("Órdenes");
  const headers = rows[0] || [];
  const idxCodigo = headers.findIndex((h) => /c[óo]digo/i.test(h));
  if (idxCodigo < 0) throw new Error("No existe columna Código en la hoja Órdenes");
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idxCodigo] || "").toString().trim() === codigo.toString().trim()) {
      return { headers, row: rows[i], rowIndex: i + 1 };
    }
  }
  return null;
}

/**
 * Genera el PDF de la orden y lo guarda en un archivo temporal.
 * Devuelve la ruta absoluta del PDF creado.
 */
export async function generateOrderPDF(codigo) {
  const found = await findRowByCode(codigo);
  if (!found) throw new Error("Orden no encontrada para generar PDF");

  const { headers, row } = found;
  const getVal = (regex) => {
    const idx = headers.findIndex((h) => regex.test(h));
    return idx >= 0 ? (row[idx] || "") : "";
  };

  const data = {
    codigo,
    cliente: getVal(/arrendatario|cliente/i),
    telefono: getVal(/tel[ée]fono/i),
    tecnico: getVal(/t[ée]cnico/i),
    estado: getVal(/estado/i),
    descripcion: getVal(/descripci[óo]n|observaci[óo]n/i),
    materiales: getVal(/material(es)?/i),
    trabajo: getVal(/trabajo/i),
    fotoAntesURL: getVal(/foto.?antes/i),
    fotoDespuesURL: getVal(/foto.?despues/i),
    firmaURL: getVal(/firma$/i),
    fecha: getVal(/fecha/i),
  };

  // Descargar evidencias
  const [imgAntes, imgDespues, imgFirma] = await Promise.all([
    downloadImage(data.fotoAntesURL),
    downloadImage(data.fotoDespuesURL),
    downloadImage(data.firmaURL),
  ]);

  // Archivo temporal
  const tmpDir = os.tmpdir();
  const pdfPath = path.join(tmpDir, `Orden_${codigo}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // PORTADA
  doc
    .fontSize(20)
    .text("Blue Home Inmobiliaria", { align: "center" })
    .moveDown(0.3);
  doc.fontSize(16).text("Orden de Trabajo", { align: "center" });
  doc.moveDown(1);

  // Datos principales
  doc.fontSize(12);
  doc.text(`Código: ${data.codigo}`);
  doc.text(`Fecha: ${data.fecha || "-"}`);
  doc.text(`Cliente/Arrendatario: ${data.cliente || "-"}`);
  doc.text(`Teléfono: ${data.telefono || "-"}`);
  doc.text(`Técnico: ${data.tecnico || "-"}`);
  doc.text(`Estado: ${data.estado || "-"}`);
  doc.moveDown(0.5);
  doc.text(`Descripción: ${data.descripcion || "-"}`);
  doc.moveDown(1);

  // Materiales y trabajo
  doc.fontSize(14).text("Materiales usados", { underline: true });
  doc.fontSize(12).text(data.materiales || "-", { align: "left" }).moveDown(0.8);

  doc.fontSize(14).text("Trabajo realizado", { underline: true });
  doc.fontSize(12).text(data.trabajo || "-", { align: "left" }).moveDown(1);

  // Fotos
  doc.fontSize(14).text("Evidencias", { underline: true }).moveDown(0.5);
  const maxW = 240;
  const maxH = 240;

  if (imgAntes) {
    doc.fontSize(12).text("Foto Antes:");
    doc.image(imgAntes, { fit: [maxW, maxH] }).moveDown(0.5);
  }
  if (imgDespues) {
    doc.fontSize(12).text("Foto Después:");
    doc.image(imgDespues, { fit: [maxW, maxH] }).moveDown(0.5);
  }

  // Firma
  if (imgFirma) {
    doc.moveDown(0.5);
    doc.fontSize(12).text("Firma del Inquilino:");
    doc.image(imgFirma, { fit: [200, 80] }).moveDown(0.5);
  }

  // Cierre
  doc.moveDown(1.2);
  doc.fontSize(10).fillColor("#666")
    .text("Este documento fue generado automáticamente por Blue Home Gestor.", { align: "center" });

  doc.end();

  // Esperar a que termine de escribir
  await new Promise((resolve) => stream.on("finish", resolve));

  return pdfPath;
}
