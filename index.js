import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { router as ordersRouter } from './routes/orders.js'; // 🔥 CAMBIO AQUÍ

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter); // ✅ ahora sí coincide con export nombrado

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PROGESTOR ejecutándose en puerto ${PORT}`));

// middleware/auth.js
export function verificarSesion(req, res, next) {
  const token = req.headers["x-user-token"];
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try {
    const user = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido" });
  }
}
