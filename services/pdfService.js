// ======================================================
// 🧾 Blue Home Gestor — Servicio de generación de PDFs
// ======================================================
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generarPDFOrden({
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
}) {
  try {
    const doc = new PDFDocument({ margin: 40 });
    const pdfPath = `/tmp/Orden_${codigo}.pdf`;
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ===== ENCABEZADO =====
    const logoPath = path.resolve("public/assets/img/logo-blanco.png");

    doc
      .rect(0, 0, doc.page.width, 70)
      .fill("#004AAD") // franja azul superior
      .fillColor("#fff")
      .fontSize(22)
      .text("ORDEN DE TRABAJO", 200, 25);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 15, { width: 100 });
    }

    doc.moveDown(2);

    // ===== DATOS PRINCIPALES =====
    doc.fillColor("#000").fontSize(12);
    doc.text(`Código: ${codigo}`);
    doc.text(`Arrendatario: ${cliente}`);
    doc.text(`Teléfono: ${telefono}`);
    doc.text(`Técnico: ${tecnico}`);
    doc.text(`Estado: ${estado}`);
    doc.moveDown(1);
    doc.fontSize(12).text("Descripción del reporte:");
    doc.fontSize(11).text(descripcion || "—", { indent: 10 });
    doc.moveDown(1);

    // ===== EVIDENCIAS =====
    doc.fontSize(14).fillColor("#004AAD").text("📸 Evidencias del trabajo");
    doc.moveDown(0.5);

    const imageWidth = 240;
    const startY = doc.y;

    if (fotoAntes && fs.existsSync(fotoAntes)) {
      doc.image(fotoAntes, 40, startY, { width: imageWidth, height: 160 });
      doc.fontSize(10).fillColor("#000").text("Antes", 130, startY + 165);
    }

    if (fotoDespues && fs.existsSync(fotoDespues)) {
      doc.image(fotoDespues, 320, startY, { width: imageWidth, height: 160 });
      doc.fontSize(10).fillColor("#000").text("Después", 420, startY + 165);
    }

    doc.moveDown(10);

    // ===== MATERIALES =====
    doc.addPage();
    doc.fillColor("#004AAD").fontSize(14).text("🧰 Materiales y Trabajo Realizado");
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(11).text(materiales || "—", { indent: 10 });
    doc.moveDown(1);

    // ===== OBSERVACIONES =====
    doc.fillColor("#004AAD").fontSize(14).text("📝 Observaciones");
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(11).text(observaciones || "—", { indent: 10 });
    doc.moveDown(2);

    // ===== FIRMA =====
    doc.fillColor("#004AAD").fontSize(14).text("✍️ Firma del Inquilino");
    doc.moveDown(0.5);

    if (firmaData) {
      const base64Image = firmaData.replace(/^data:image\/png;base64,/, "");
      const firmaPath = `/tmp/firma_${codigo}.png`;
      fs.writeFileSync(firmaPath, base64Image, "base64");
      doc.image(firmaPath, 60, doc.y, { width: 200 });
      fs.unlinkSync(firmaPath);
    } else {
      doc.fillColor("#aaa").text("Sin firma registrada.");
    }

    doc.moveDown(4);

    // ===== ESPACIO PARA DAYAN =====
    doc.fillColor("#004AAD").fontSize(14).text("💰 Valores asignados por Dayan Correa");
    doc.moveDown(1);
    doc.fillColor("#000").fontSize(11).text("Materiales: ____________________________");
    doc.text("Mano de obra: ____________________________");
    doc.text("Total: ____________________________");

    // ===== PIE DE PÁGINA =====
    doc.moveDown(4);
    doc.fontSize(9).fillColor("#555").text(
      "Documento generado automáticamente por Blue Home Inmobiliaria • Gestor de Procesos",
      { align: "center" }
    );

    doc.end();

    await new Promise((resolve) => stream.on("finish", resolve));
    console.log(`✅ PDF generado correctamente: ${pdfPath}`);
    return pdfPath;
  } catch (e) {
    console.error("❌ Error al generar PDF:", e);
    throw e;
  }
}
