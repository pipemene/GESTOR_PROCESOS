import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// 🔹 Rutas
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { router as ordersRouter } from "./routes/orders.js"; // ✅ Import correcto

// 🔹 Configuración de entorno
dotenv.config();

// 🔹 Inicialización de Express
const app = express();

// 🔹 Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ==================================================
// 🔹 RUTAS PRINCIPALES DE API
// ==================================================
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

// ==================================================
// 🔹 MANEJO DE ERRORES DE API
// ==================================================
// Si una ruta /api/... no existe → responder en JSON (no HTML)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, error: "Ruta no encontrada en API" });
  }
  next();
});

// ==================================================
// 🔹 RUTA BASE
// ==================================================
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ==================================================
// 🔹 INICIO DEL SERVIDOR
// ==================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PROGESTOR ejecutándose en puerto ${PORT}`));
