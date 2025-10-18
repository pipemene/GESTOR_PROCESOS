// ======================================================
// 🏠 Blue Home Gestor — Servidor Principal (index.js)
// ======================================================
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// 🔹 Rutas del sistema
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { router as ordersRouter } from "./routes/orders.js";

// 🔹 Configuración inicial
dotenv.config();
const app = express();

// ======================================================
// 🔧 Middlewares
// ======================================================
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // 📁 Carpeta donde están los HTML (login, admin, etc.)

// ======================================================
// 🚀 Rutas principales de la API
// ======================================================
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

// ======================================================
// 🌐 Ruta raíz (redirige al login)
// ======================================================
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
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
  console.log(`✅ PROGESTOR ejecutándose en puerto ${PORT}`)
);
