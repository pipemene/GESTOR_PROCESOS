# GESTOR DE PROCESOS – Frontend HTML + Google Apps Script

Este paquete contiene un **frontend HTML** listo para conectar con un **Apps Script** que guarda y lee datos desde **Google Sheets** (usuarios y radicados).

## Contenido
- `index.html` → Interfaz para registrar usuarios, iniciar sesión, crear radicados y listarlos.
- `apps_script_code.gs` → Código listo para pegar en Apps Script (Web App).
- `README.md` → Este archivo con pasos de implementación.

## Estructura de Google Sheets
Crea un Spreadsheet (Google Sheets) y usa **dos hojas**:

1. `USERS` con columnas (en este orden):
   ```
   timestamp | name | email | pass_hash
   ```

2. `RADICADOS` con columnas:
   ```
   timestamp | radicado | email | asunto | detalle | cliente | prioridad | estado
   ```

> No es obligatorio poner cabeceras, pero es recomendable. El script asume que la primera fila podría ser cabecera al listar.

## Pasos: Apps Script (Backend)
1. Abre [script.new](https://script.new) y pega el contenido de `apps_script_code.gs`.
2. Reemplaza `SHEET_ID` con el ID de tu Spreadsheet (lo que está entre `/d/` y `/edit` en la URL).
3. Menú **Implementar → Implementar como aplicación web**:
   - Tipo: **App web**
   - ¿Quién tiene acceso? **Cualquiera con el enlace** (para pruebas rápidas)
   - Copia la **URL** resultante.

> Luego puedes restringir acceso por Google y agregar verificación si lo necesitas.

## Pasos: Frontend (index.html)
1. Abre el archivo `index.html` en el navegador.
2. En la sección **Autenticación**, pega la **URL de tu Apps Script** y presiona **Guardar URL**.
3. Regístrate, inicia sesión y prueba crear/listar radicados.

## Notas de seguridad (MVP)
- Las contraseñas se guardan como **SHA-256** (hash) en la hoja `USERS`.
- Este MVP no usa JWT ni sesiones; se apoya en el email del usuario. Puedes ampliarlo agregando una hoja `TOKENS` y validación por token en cada llamada.
- Para entornos productivos:
  - Cambia la publicación del Web App para que **solo usuarios de tu dominio** puedan acceder.
  - Implementa roles y validación por token en las acciones.

## Personalización
- Cambia estilos y textos en `index.html` a tu identidad visual (colores azul/gris de Blue Home).
- Puedes agregar campos adicionales a los radicados (ej. adjuntos, prioridad numérica, técnico asignado, etc.).
- Para IDs de radicado secuenciales, reemplaza `nextRadicado()` por un contador basado en la última fila.

¡Éxitos con el despliegue!