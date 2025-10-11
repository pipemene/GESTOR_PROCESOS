// ==============================
// ✅ CONFIGURACIÓN GLOBAL BLUE HOME GESTOR
// ==============================

// Variables de entorno
export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
export const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
export const GMAIL_USER = process.env.GMAIL_USER;
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
export const SERVER_PORT = process.env.PORT || 3000;

// ==============================
// 🧩 Validación automática de variables
// ==============================
const requiredVars = {
  GOOGLE_SHEET_ID,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
};

console.log("✅ Archivo config.js cargado correctamente.\n📁 Variables activas:");

console.log({
  GOOGLE_SHEET_ID,
  GOOGLE_DRIVE_FOLDER_ID,
  GMAIL_USER,
  SERVER_PORT,
});

// Verificar si alguna variable falta
const missingVars = Object.entries(requiredVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("⚠️  Advertencia: faltan variables de entorno en Railway:");
  missingVars.forEach((v) => console.error(`   ❌ ${v}`));
  console.error(
    "\n👉 Revisa la pestaña 'Variables' en Railway y asegúrate de que todas estén definidas correctamente."
  );
} else {
  console.log("✅ Todas las variables de entorno están configuradas correctamente.\n");
}
