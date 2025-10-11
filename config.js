import dotenv from "dotenv";
dotenv.config();

export const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SPREADSHEET_ID,
  USERS_SHEET,
  ORDERS_SHEET,
  JWT_SECRET,
  DRIVE_FOLDER_ID // 👈 ESTA ES LA VARIABLE QUE FALTABA
} = process.env;
