# Blue Home – Gestor de Reparaciones (Railway + GitHub)

**Producción:** https://gestorprocesos-production.up.railway.app/

Este repo contiene:
- **Backend Node.js (Express)** listo para Railway
- Variables en **`.env`** (usa `.env.example`)
- Carpeta **`appscript/`** con el proyecto de Google Apps Script (UI de órdenes) para respaldo/restauración

---

## 🚀 Despliegue rápido en Railway
1. Subir a GitHub este proyecto (tal cual).
2. En Railway → **New Project** → **Deploy from GitHub** → selecciona el repo.
3. En **Variables** pega el contenido de `.env.example` con tus valores reales.
4. Deploy. La app quedará en `2025-10-09` funcionando y la raíz (`/`) devolverá `{"status":"ok"}`.

## 🔧 Endpoints incluidos
- `GET /` → healthcheck
- `GET /api/config` → devuelve IDs/URLs (para Apps Script y diagnósticos)
- `GET /api/orders` → placeholder (implementación a tu elección)
- `POST /api/orders` → placeholder (eco del payload)

> Nota: Para usar **Sheets/Drive** desde el backend, necesitarás credenciales de servicio de Google o un API en tu Apps Script que acepte peticiones REST.
> El Apps Script incluido es funcional como **UI** y genera PDFs/fotos/firmas guardando en Drive.

## 🔐 Variables `.env`
Ver `.env.example`. Nunca subas `.env` real al repo.

## 🧩 Carpeta `appscript/`
Incluye todo el código de la Web App (login, panel, órdenes, fotos, firma y PDF). Sube estos archivos al editor de Google Apps Script si necesitas restaurar.

---

### ✅ Para conectar Apps Script ←→ Backend
En Apps Script, puedes leer `/api/config` con `UrlFetchApp.fetch()` y así evitas hardcodear IDs. Ejemplos incluidos en el **respaldo maestro `.txt`**.
