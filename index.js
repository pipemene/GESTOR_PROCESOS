// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { router as ordersRouter } from "./routes/orders.js";

import { protegerRutas } from "./middleware/protegerRutas.js"; // 🔐 Middleware de roles

dotenv.config();
const app = express();

// ======================================================
// 🧱 CONFIGURACIÓN BÁSICA
// ======================================================
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 🗂️ SERVIR ARCHIVOS ESTÁTICOS (HTML, JS, etc.)
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// 🔐 RUTAS PROTEGIDAS Y API PRINCIPAL
// ======================================================

// 🔹 Auth pública (login, etc.)
app.use("/api/auth", authRouter);

// 🔹 Usuarios — solo accesible para superadmin (Pipe)
app.use("/api/users", protegerRutas(["superadmin"]), usersRouter);

// 🔹 Órdenes — accesible por varios roles (técnicos, admin, reparaciones, etc.)
app.use("/api/orders", protegerRutas(["superadmin", "admin", "arrendamiento", "reparaciones", "facturacion", "tecnico"]), ordersRouter);

// ======================================================
// 🏠 RUTA POR DEFECTO
// ======================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// ⚙️ PUERTO Y ARRANQUE
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PROGESTOR ejecutándose en puerto ${PORT}`);
  console.log("🌐 Servidor iniciado correctamente y archivos públicos listos.");
});
;
