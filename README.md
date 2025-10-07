# Blue Home – Gestor de Procesos v2 (Código inmutable en edición)

Tema oscuro (azul marino / gris carbón) + Node (Express) + Apps Script.
Incluye asignar, editar (sin modificar 'Código'), eliminar y auto-asignación por técnico.
Actualización en vivo sin recargar.

## Variables en Railway
```
PORT=3000
GAS_URL=https://script.google.com/macros/s/TU_URL_EXEC/exec
```

## Estructura
- `server/index.js` → API Express (`/api/login`, `/api/listOrders`, `/api/createOrder`, `/api/assignOrder`, `/api/updateOrder`, `/api/deleteOrder`, `/api/test`)
- `frontend/` → `index.html`, `css/style.css`, `js/main.js`, `js/ordenes.js`
- `apps_script_code_v2.gs` → Pega en Apps Script. Cambia `SHEET_ID` si actualiza la hoja.

## Hojas requeridas
- **Usuarios**: `Usuario | Clave | Rol`
- **Ordenes**: `Radicado | Fecha | Inquilino | Telefono | Código | Descripcion | Tecnico | Estado | Observaciones | Fotos | Firma`
