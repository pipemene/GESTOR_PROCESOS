import PDFDocument from "pdfkit";
import fs from "fs";
import axios from "axios";
import { getSheetData } from "./sheetsService.js";
import { ensureOrderFolder } from "./driveService.js";

async function loadImageToBuffer(url) {
  try {
    if (!url) return null;
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(res.data, "binary");
  } catch {
    console.warn("⚠️ No se pudo cargar imagen:", url);
    return null;
  }
}

export async function generateOrderPDF(codigo, { modo = "tecnico" } = {}) {
  const rows = await getSheetData("Órdenes");
  const headers = rows[0];
  const idxCodigo = headers.findIndex(h => /c[óo]digo/i.test(h));
  const orderRow = rows.find(r => r[idxCodigo] == codigo);
  if (!orderRow) throw new Error("Orden no encontrada en hoja");

  const data = {};
  headers.forEach((h, i) => (data[h] = orderRow[i] || ""));

  const pdfPath = `/tmp/Orden_${codigo}_${modo}.pdf`;
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(18).text(`Blue Home Inmobiliaria`, { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Orden de Servicio ${codigo}`, { align: "center" });
  doc.moveDown(1);

  doc.fontSize(11).text(`Arrendatario: ${data["Arrendatario"] || ""}`);
  doc.text(`Teléfono: ${data["Teléfono"] || ""}`);
  doc.text(`Técnico: ${data["Técnico"] || ""}`);
  doc.text(`Estado: ${data["Estado"] || ""}`);
  doc.text(`Descripción: ${data["Descripción"] || data["Observación"] || ""}`);
  doc.moveDown();

  const fotoAntes = await loadImageToBuffer(data["Foto Antes"]);
  if (fotoAntes) doc.image(fotoAntes, { fit: [250, 150], align: "left" });

  const fotoDespues = await loadImageToBuffer(data["Foto Después"]);
  if (fotoDespues) {
    doc.moveDown();
    doc.image(fotoDespues, { fit: [250, 150], align: "left" });
  }

  doc.moveDown(2);
  const firmaInq = await loadImageToBuffer(data["Firma Inquilino"]);
  if (firmaInq) {
    doc.text("Firma Inquilino:", { align: "left" });
    doc.image(firmaInq, { width: 100 });
  }

  if (modo !== "tecnico") {
    const firmaDayan = await loadImageToBuffer(data["Firma Dayan"]);
    if (firmaDayan) {
      doc.moveDown();
      doc.text("Firma Dayan (Revisión):", { align: "left" });
      doc.image(firmaDayan, { width: 100 });
    }

    if (data["Valor"]) {
      doc.moveDown();
      doc.fontSize(13).text(`Valor aprobado: $${data["Valor"]}`, { align: "left" });
    }
  }

  if (modo === "final") {
    const factura = await loadImageToBuffer(data["Factura"]);
    if (factura) {
      doc.addPage();
      doc.fontSize(14).text("Factura adjunta:", { align: "center" });
      doc.image(factura, { fit: [450, 500], align: "center" });
    }
  }

  doc.end();
  await ensureOrderFolder(codigo);
  console.log(`✅ PDF generado para ${codigo} (${modo})`);
  return pdfPath;
}
