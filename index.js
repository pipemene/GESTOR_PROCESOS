// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// 🔹 Importar rutas
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { router as ordersRouter } from "./routes/orders.js";

// 🔹 Middleware de seguridad
import { protegerRutas } from "./middleware/protegerRutas.js";

dotenv.config();
const app = express();

// ======================================================
// 🧱 CONFIGURACIÓN BÁSICA
// ======================================================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 📁 SERVIR ARCHIVOS ESTÁTICOS (HTML, JS, CSS)
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// 🔐 DEFINICIÓN DE RUTAS
// ======================================================

// Rutas de autenticación (login, etc.)
app.use("/api/auth", authRouter);

// Rutas de usuarios — solo accesibles para Pipe (superadmin)
app.use("/api/users", protegerRutas(["superadmin"]), usersRouter);

// Rutas de órdenes — accesibles para varios roles
app.use(
  "/api/orders",
  protegerRutas([
    "superadmin",
    "admin",
    "arrendamiento",
    "reparaciones",
    "facturacion",
    "tecnico",
  ]),
  ordersRouter
);

// ======================================================
// 🏠 RUTA BASE (PÁGINA PRINCIPAL DE LOGIN)
// ======================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// ⚙️ ARRANQUE DEL SERVIDOR
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor Blue Home Gestor ejecutándose en puerto ${PORT}`);
  console.log("🌐 Archivos públicos disponibles y API inicializada correctamente.");
});
