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
