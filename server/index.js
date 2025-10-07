// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const GAS_URL = process.env.GAS_URL;

async function callGAS(action, payload = {}) {
  if (!GAS_URL) throw new Error("GAS_URL no configurada");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload })
  });
  let data;
  try { data = await res.json(); }
  catch(e){ const txt = await res.text(); throw new Error(`Respuesta no JSON desde GAS: ${txt.slice(0,160)}`); }
  if (!res.ok || data.status !== "ok") throw new Error(data?.message || `Error GAS en ${action}`);
  return data.data;
}

app.get("/api/test", (req, res) => res.json({ ok:true, now:new Date().toISOString(), env:{ PORT, GAS_URL_present: !!GAS_URL } }));

app.post("/api/login", async (req,res)=>{
  try{ const {usuario, clave} = req.body||{}; const data = await callGAS("login",{usuario,clave}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

app.post("/api/listOrders", async (req,res)=>{
  try{ const data = await callGAS("listOrders", req.body||{}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

app.post("/api/createOrder", async (req,res)=>{
  try{ const data = await callGAS("createOrder", req.body||{}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

app.post("/api/assignOrder", async (req,res)=>{
  try{ const data = await callGAS("assignOrder", req.body||{}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

app.post("/api/updateOrder", async (req,res)=>{
  try{ const data = await callGAS("updateOrder", req.body||{}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

app.post("/api/deleteOrder", async (req,res)=>{
  try{ const data = await callGAS("deleteOrder", req.body||{}); res.json({status:"ok", data});}
  catch(err){ res.status(400).json({status:"error", message:String(err.message||err)}); }
});

// static
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname,"../frontend");
app.use(express.static(publicDir));
app.get("/", (req,res)=>res.sendFile(path.join(publicDir,"index.html")));

app.listen(PORT, ()=>console.log(`[OK] Blue Home v2 escuchando en ${PORT}`));
