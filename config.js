// config.js — configuración centralizada
import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  env: process.env.BLUEHOME_ENV || "development",

  sheet: {
    id: process.env.SPREADSHEET_ID,
    url: process.env.SPREADSHEET_URL,
  },

  drive: {
    id: process.env.DRIVE_FOLDER_ID,
    url: process.env.DRIVE_URL,
  },

  appscript: {
    webappUrl: process.env.APPSCRIPT_WEBAPP_URL,
  },

  openai: {
    key: process.env.OPENAI_API_KEY || null,
  },
};
