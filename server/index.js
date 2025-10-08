import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({limit:"25mb"}));

const GAS_URL = process.env.GAS_URL;
const PORT = process.env.PORT || 3000;

const publicDir = path.resolve(__dirname, "../frontend");
app.use(express.static(publicDir));

app.get("/api/test", async (req,res)=>{
  try{
    const r = await fetch(`${GAS_URL}?action=ping`);
    const msg = await r.text();
    res.json({ ok:true, msg });
  }catch(e){ res.status(500).json({ ok:false, error:String(e)}); }
});

app.post("/api/login", async (req,res)=>{
  try{
    const usuario = encodeURIComponent(req.body?.usuario || "");
    const clave = encodeURIComponent(req.body?.clave || "");
    const url = `${GAS_URL}?action=login&usuario=${usuario}&clave=${clave}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  }catch(e){ res.status(500).json({ ok:false, error:String(e)}); }
});

app.get("/api/getOrders", async (req,res)=>{
  try{
    const r = await fetch(`${GAS_URL}?action=getOrders`);
    const data = await r.json();
    res.json(data);
  }catch(e){ res.status(500).json({ ok:false, error:String(e)}); }
});

app.post("/api/saveSignature", async (req,res)=>{
  try{
    const { radicado, firma } = req.body || {};
    const url = `${GAS_URL}?action=saveSignature&radicado=${encodeURIComponent(radicado||"")}&firma=${encodeURIComponent(firma||"")}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  }catch(e){ res.status(500).json({ ok:false, error:String(e)}); }
});

app.get("/", (req,res)=> res.sendFile(path.join(publicDir, "index.html")));
app.get("/ordenes", (req,res)=> res.sendFile(path.join(publicDir, "ordenes.html")));

app.listen(PORT, ()=> console.log(`✅ BlueHome server corriendo en puerto ${PORT}`));
