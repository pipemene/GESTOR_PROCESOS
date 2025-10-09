
# 🏗️ Blue Home Inmobiliaria - Gestor de Reparaciones (Railway)

Backend oficial conectado con Google Sheets, Drive y Apps Script.

## 🚀 Cómo desplegar
1. Sube este proyecto a **GitHub**.
2. Conéctalo a **Railway**.
3. En Railway → Variables → Bulk Edit → pega las variables del archivo `.env.example`.
4. Guarda y despliega.

## 🧩 Endpoints principales
- `GET /` → Estado del servidor.
- `GET /api/config` → Configuración (Sheets, Drive, AppScript).
- `POST /api/orders` → Crea una orden en Google Sheets vía Apps Script.

## ⚙️ Estructura
- `index.js`: Servidor principal Express.
- `config.js`: Carga de variables de entorno.
- `.env.example`: Variables de configuración.
- `appscript/`: Carpeta con código de Apps Script (HTML, Code.gs, etc.)

## ✅ Autor
**Blue Home Inmobiliaria**  
Palmira, Colombia  
www.bluehomeinmobiliaria.com
