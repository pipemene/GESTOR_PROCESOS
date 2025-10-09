
const express = require('express');
const fetch = global.fetch || ((...args)=>import('node-fetch').then(({default: f})=>f(...args)));
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true, limit:'10mb'}));
app.use(morgan('dev'));
app.use(express.static('frontend'));

const PORT = process.env.PORT || 3000;
const GAS = process.env.APPSCRIPT_URL;
const DEBUG = String(process.env.DEBUG||'false').toLowerCase()==='true';
const dlog = (...a)=>{ if(DEBUG) console.log('[DEBUG]', ...a); };

if(!GAS){ console.error('FALTA VARIABLE APPSCRIPT_URL'); process.exit(1); }

async function gasGet(params){
  const url = `${GAS}?${new URLSearchParams(params)}`;
  dlog('GET -> GAS', url);
  const r = await fetch(url, {method:'GET'});
  const txt = await r.text();
  dlog('GAS raw:', txt.slice(0,250));
  try { return JSON.parse(txt); } catch(e){ 
    return { ok:false, msg:'Respuesta no JSON desde GAS', raw: txt };
  }
}

app.get('/api/test', async (req,res)=>{
  try{
    const data = await gasGet({action:'ping'});
    res.json({ ok:true, env:{ port:PORT, debug:DEBUG }, gas:data });
  }catch(err){
    res.status(500).json({ ok:false, error: String(err) });
  }
});

app.post('/api/login', async (req,res)=>{
  try{
    const { usuario='', clave='' } = req.body || {};
    const data = await gasGet({
      action:'login',
      usuario: encodeURIComponent(usuario),
      clave: encodeURIComponent(clave)
    });
    dlog('Login GAS ->', data);
    if(data && data.ok) return res.json(data);
    return res.status(401).json({ ok:false, msg: (data && data.msg) || 'Login inválido' });
  }catch(err){
    res.status(500).json({ ok:false, error:String(err) });
  }
});

app.get('/api/ordenes', async (req,res)=>{
  try{
    const data = await gasGet({action:'getOrders'});
    if(!data.ok) return res.status(500).json(data);
    res.json(data);
  }catch(err){
    res.status(500).json({ ok:false, error:String(err) });
  }
});

app.post('/api/firma', async (req,res)=>{
  try{
    const { radicado, firma } = req.body;
    const data = await gasGet({ action:'saveSignature', radicado, firma });
    res.json(data);
  }catch(err){
    res.status(500).json({ ok:false, error:String(err) });
  }
});

app.listen(PORT, ()=>{
  console.log(`BlueHome Gestor v3.5 (debug=${DEBUG}) escuchando en puerto ${PORT}`);
  console.log('GAS_URL:', GAS);
});
