// ======================================================
// 📧 services/mailService.js
// Servicio para envío de correos con Gmail OAuth2
// ======================================================

import nodemailer from "nodemailer";
import { google } from "googleapis";

const {
  GMAIL_USER,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN
} = process.env;

// ======================================================
// ⚙️ Configuración de OAuth2
// ======================================================
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: GMAIL_REFRESH_TOKEN,
});

// ======================================================
// 📤 Función para enviar correos
// ======================================================
export async function sendMail(to, subject, html) {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `"Blue Home Inmobiliaria" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Correo enviado correctamente a ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error.message);
    throw new Error("Error al enviar correo");
  }
}
