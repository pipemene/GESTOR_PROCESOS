// ======================================================
// ✉️ services/mailService.js
// Blue Home Gestor - Envío de notificaciones por correo
// ======================================================

import nodemailer from "nodemailer";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// ======================================================
// 🔹 Autenticación OAuth2 con Gmail
// ======================================================
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

// ======================================================
// 🔹 Crear transportador
// ======================================================
async function createTransporter() {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
  } catch (error) {
    console.error("❌ Error creando transportador Gmail:", error);
    throw error;
  }
}

// ======================================================
// 🔹 Plantilla HTML de correo
// ======================================================
function generarPlantillaCorreo(codigo, enlaceDrive, descripcion = "", tecnico = "", cliente = "") {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f6f8fb;color:#333;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="background:#004aad;padding:10px 20px;display:flex;align-items:center;gap:10px;">
        <img src="https://i.ibb.co/nwbrWzD/logo-blanco.png" alt="Blue Home" style="height:45px;">
        <h2 style="color:#fff;margin:0;">Orden Finalizada</h2>
      </div>
      <div style="padding:20px;">
        <p>Se ha finalizado una orden de reparación con el siguiente detalle:</p>
        <ul style="list-style:none;padding-left:10px;">
          <li><b>🔢 Código:</b> ${codigo}</li>
          <li><b>👤 Técnico:</b> ${tecnico || "No especificado"}</li>
          <li><b>🏠 Cliente:</b> ${cliente || "No especificado"}</li>
          <li><b>📝 Descripción:</b> ${descripcion || "Sin descripción"}</li>
        </ul>
        <p>Puedes revisar la evidencia y archivos de esta orden en el siguiente enlace:</p>
        <p><a href="${enlaceDrive}" target="_blank" style="background:#004aad;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Ver Evidencias</a></p>
      </div>
      <div style="background:#f0f2f5;padding:10px;text-align:center;font-size:13px;color:#555;">
        <p>📍 Blue Home Inmobiliaria<br>
        Calle 31 #22-07, Palmira<br>
        info@bluehomeinmo.co | +57 602 280 6940</p>
      </div>
    </div>
  </div>`;
}

// ======================================================
// 🔹 Enviar notificación de orden finalizada
// ======================================================
export async function sendOrderNotification(codigo, enlaceDrive, descripcion = "", tecnico = "", cliente = "") {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Blue Home Gestor" <${process.env.GMAIL_USER}>`,
      to: "reparaciones@bluehomeinmo.co",
      subject: `Orden Finalizada - Código ${codigo}`,
      html: generarPlantillaCorreo(codigo, enlaceDrive, descripcion, tecnico, cliente),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Correo enviado correctamente a reparaciones@bluehomeinmo.co`);
    return result;
  } catch (error) {
    console.error("❌ Error enviando correo a reparaciones:", error.message);

    // Intentar nuevamente (una vez)
    try {
      const transporter = await createTransporter();
      await transporter.sendMail(mailOptions);
      console.log("🔁 Reintento exitoso de correo.");
    } catch (retryErr) {
      console.error("❌ Segundo intento de correo fallido:", retryErr.message);
    }

    throw error;
  }
}
