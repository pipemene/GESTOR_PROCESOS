import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({limit:'10mb'}));

const GAS_URL = process.env.GAS_URL;
const PORT = process.env.PORT || 3000;

const publicDir = path.resolve(__dirname, '../frontend');
app.use(express.static(publicDir));

app.get('/api/test', async (req,res)=>{
  try {
    const ping = await fetch(`${GAS_URL}?action=ping`).then(r=>r.text());
    res.json({ok:true,ping});
  } catch(e){ res.json({ok:false,error:String(e)}) }
});

app.post('/api/login', async (req,res)=>{
  try {
    const {usuario,clave} = req.body;
    const r = await fetch(`${GAS_URL}?action=login&usuario=${usuario}&clave=${clave}`);
    const data = await r.json();
    res.json(data);
  }catch(e){res.json({success:false,error:String(e)})}
});

app.get('/api/listUsers', async (req,res)=>{
  try{const r = await fetch(`${GAS_URL}?action=listUsers`); const data=await r.json(); res.json(data);}catch(e){res.json({error:String(e)})}
});

app.get('/', (req,res)=>res.sendFile(path.join(publicDir,'index.html')));
app.get('/ordenes',(req,res)=>res.sendFile(path.join(publicDir,'ordenes.html')));
app.get('/usuarios',(req,res)=>res.sendFile(path.join(publicDir,'usuarios.html')));

app.listen(PORT,()=>console.log('Servidor BlueHome activo en puerto '+PORT));