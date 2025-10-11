import dotenv from 'dotenv';
dotenv.config();

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
export const USERS_SHEET = process.env.USERS_SHEET;
export const ORDERS_SHEET = process.env.ORDERS_SHEET;
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
export const JWT_SECRET = process.env.JWT_SECRET;
