// routes/users.js
import express from "express";
import { getAllUsers } from "../services/usersService.js";

const router = express.Router();

// 🔹 Listar todos los usuarios (login y admin usan este endpoint)
router.get("/", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (e) {
    console.error("❌ Error al obtener usuarios:", e);
    res.status(500).json({ error: "Error al cargar usuarios" });
  }
});

export default router;
