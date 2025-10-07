# Gestor de Procesos – Blue Home v1 (Railway Ready)

Frontend **HTML** con menú lateral + Backend **Node.js (Express)** y **Google Apps Script** como conector a Google Sheets.

## 1) Variables en Railway
Crea estas variables (Settings → Variables):
```
PORT=3000
GAS_URL=https://script.google.com/macros/s/AKfycbwacg0DwgrJgu9kr6EHhsoCObaSCsKpgHjJjFjNu8r0KpiwLErLV3DDbyVI0clnqbHgAQ/exec
```

## 2) Apps Script
Pega `apps_script_code.gs` en [script.new](https://script.new) y cambia:
```js
const SHEET_ID = 'PON_AQUI_EL_ID_DE_TU_SPREADSHEET';
```
Publica como **Aplicación web** (cualquiera con el enlace) y usa esa URL en `GAS_URL`.

Estructura de hojas:
- **Usuarios**: `Usuario | Clave | Rol`
- **Ordenes**: `Radicado | Fecha | Inquilino | Telefono | Código | Descripcion | Tecnico | Estado | Observaciones | Fotos | Firma`

## 3) Instalar y ejecutar local
```
npm install
npm run start
```
Abre `http://localhost:3000`

## 4) Endpoints disponibles
- `GET /api/test` → prueba variables
- `POST /api/login` → { usuario, clave }
- `POST /api/createOrder` → { usuario, inquilino, telefono, codigo, descripcion, tecnico, prioridad, estado }
- `POST /api/listOrders` → { usuario, rol }

## 5) Frontend
- **Roles**: SuperAdmin (todo), admin (crear/listar), tecnico (solo ver asignadas).
- Menú lateral azul marino / gris carbón con módulos `Órdenes`, `Usuarios`, `Reportes`, `Configuración` (habilitados, placeholders).

## 6) Logo
Se incluye `logo.svg` como marcador. Puedes reemplazarlo por tu logo oficial manteniendo el mismo nombre de archivo.
