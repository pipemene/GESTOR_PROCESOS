// services/mailService.js
import nodemailer from "nodemailer";
import { GMAIL_USER, GMAIL_APP_PASSWORD } from "../config.js";

/**
 * Envía correo con Nodemailer (cuenta Gmail App Password).
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `Blue Home Reparaciones <${GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });

  return info;
}
