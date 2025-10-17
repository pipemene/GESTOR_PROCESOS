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

// 🔹 Rutas principales
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

// 🔹 Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PROGESTOR ejecutándose en puerto ${PORT}`));
