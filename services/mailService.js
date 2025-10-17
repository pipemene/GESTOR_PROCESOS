/**
 * ============================================================
 *  📬 Blue Home Mail Service
 *  Autor: Andrés Felipe Meneses (Blue Home Inmobiliaria)
 *  Descripción:
 *    Servicio centralizado para el envío de correos
 *    con soporte para HTML, adjuntos y registro inteligente.
 * ============================================================
 */

import nodemailer from "nodemailer";
import os from "os";

/**
 * Crea y configura el transporter de Nodemailer
 * ------------------------------------------------------------
 * Soporta Gmail estándar o Google Workspace.
 * Si no hay credenciales, desactiva el envío sin romper el flujo.
 */
async function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("📭 Envío de correo desactivado: faltan credenciales.");
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  // Validar conexión (opcional, ignora si falla)
  try {
    await transporter.verify();
    console.log("✅ Gmail conectado correctamente como:", user);
  } catch {
    console.log("⚠️ No se pudo verificar conexión SMTP, pero se continuará...");
  }

  return transporter;
}

/**
 * Envía un correo electrónico con los parámetros especificados.
 * ------------------------------------------------------------
 * @param {Object} options
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} [options.text] - Cuerpo de texto plano
 * @param {string} [options.html] - Cuerpo HTML
 * @param {Array} [options.attachments] - Adjuntos opcionales
 */
export async function sendEmail({ to, subject, text = "", html = "", attachments = [] }) {
  const transporter = await createTransporter();

  if (!transporter) {
    console.log("📭 Correo no enviado (modo sin credenciales activo).");
    return { sent: false, reason: "Sin credenciales configuradas" };
  }

  const senderName = "Blue Home Inmobiliaria";
  const senderEmail = process.env.GMAIL_USER;

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    text: text || "Mensaje sin cuerpo de texto.",
    html:
      html ||
      `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #004aad;">${senderName}</h2>
          <p>${text || "Mensaje automático sin contenido adicional."}</p>
          <hr style="border:none;border-top:1px solid #ccc;margin:20px 0;">
          <p style="font-size:13px;color:#888;">
            Este mensaje fue enviado automáticamente desde el Gestor de Procesos Blue Home<br>
            Servidor: ${os.hostname()} | ${new Date().toLocaleString("es-CO")}
          </p>
        </div>
      `,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      path: a.path,
      contentType: a.contentType || "application/octet-stream",
    })),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Correo enviado con éxito a:", to);
    console.log("🧾 Message ID:", info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error al enviar correo:", error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Envía notificación automática al cerrar una orden.
 * ------------------------------------------------------------
 * Uso sugerido en routes/orders.js → finish()
 */
export async function sendOrderNotification(codigo, pdfLink, destinatario = "reparaciones@bluehomeinmo.co") {
  const asunto = `Orden finalizada ${codigo} 🧾`;
  const cuerpo = `
    <p>Hola equipo 👋,</p>
    <p>La orden <strong>${codigo}</strong> ha sido marcada como finalizada.</p>
    <p>Puedes ver el PDF completo aquí:</p>
    <p><a href="${pdfLink}" target="_blank" style="color:#004aad;font-weight:bold;">Ver PDF de la orden</a></p>
    <p>— Blue Home Gestor de Procesos</p>
  `;

  return await sendEmail({
    to: destinatario,
    subject: asunto,
    html: cuerpo,
  });
}
