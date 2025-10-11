import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter, { authGuard, roleGuard } from './routes/auth.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/orders', authGuard, ordersRouter);
app.use('/api/users', authGuard, roleGuard('SuperAdmin'), usersRouter);

app.get('/', (_req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ PROGESTOR running on ${PORT}`));
