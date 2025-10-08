// server/index.js (v3.1)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const PORT = process.env.PORT || 3000;
const GAS_URL = process.env.GAS_URL;
if(!GAS_URL) console.warn("[WARN] GAS_URL no configurada");

async function callGAS(action, payload = {}){
  if(!GAS_URL) throw new Error("GAS_URL no configurada");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action, payload })
  });
  let data;
  try{ data = await res.json(); }
  catch(e){ const t = await res.text(); throw new Error(`Respuesta no JSON desde GAS: ${t.slice(0,180)}`); }
  if(!res.ok || data.status!=="ok") throw new Error(data?.message || `Error GAS en ${action}`);
  return data.data;
}

// Core endpoints
app.get("/api/test", (req,res)=>res.json({ok:true, now:new Date().toISOString(), env:{PORT, GAS_URL_present: !!GAS_URL}}));
app.post("/api/login", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("login", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/listOrders", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("listOrders", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/createOrder", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("createOrder", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/assignOrder", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("assignOrder", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/updateOrder", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("updateOrder", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/deleteOrder", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("deleteOrder", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });

// v3 Drive features
app.post("/api/updateWork", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("updateWork", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/saveSignature", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("saveSignature", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });
app.post("/api/generatePDF", async (req,res)=>{ try{ res.json({status:"ok", data: await callGAS("generatePDF", req.body||{})}); } catch(e){ res.status(400).json({status:"error", message:String(e.message||e)});} });

// Static
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../frontend");
app.use(express.static(publicDir));
app.get("/", (req,res)=>res.sendFile(path.join(publicDir,"index.html")));

app.listen(PORT, ()=>console.log(`[OK] Blue Home v3.1 escuchando en ${PORT}`));
