// services/mailService.js
import nodemailer from "nodemailer";
import { google } from "googleapis";

// Variables del entorno (Railway)
const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_USER
} = process.env;

// Configuración del cliente OAuth2
const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

// ======================================================
// 🔹 Función principal: enviar correo con PDF adjunto
// ======================================================
export async function sendEmail({ to, subject, html, attachments = [] }) {
  try {
    // Obtener access token dinámico
    const accessToken = await oAuth2Client.getAccessToken();

    // Crear transporte con OAuth2
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });

    // Opciones del correo
    const mailOptions = {
      from: `"Blue Home Inmobiliaria" <${GMAIL_USER}>`,
      to,
      subject,
      html,
      attachments
    };

    // Enviar correo
    const result = await transporter.sendMail(mailOptions);
    console.log(`📨 Correo enviado correctamente a ${to}`);
    return result;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    throw new Error("No se pudo enviar el correo");
  }
}
