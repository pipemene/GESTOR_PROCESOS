// ======================================================
// 🏠 Blue Home Gestor — Servidor Principal (index.js)
// ======================================================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// 🔹 Rutas del sistema
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { router as ordersRouter } from "./routes/orders.js";

// ======================================================
// 🔧 Configuración base
// ======================================================
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// 🔧 Middlewares
// ======================================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // 📁 Public

// ======================================================
// 🚀 Rutas principales de la API
// ======================================================
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

// ======================================================
// 🌐 Ruta raíz — entrega el login (index.html)
// ======================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// 🛠️ Captura cualquier ruta no encontrada y redirige al login
// ======================================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// ⚠️ Manejo de errores global
// ======================================================
app.use((err, req, res, next) => {
  console.error("❌ Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor." });
});

// ======================================================
// 🚀 Iniciar servidor
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ PROGESTOR ejecutándose correctamente en puerto ${PORT}`)
);
