// services/usersService.js
import dotenv from "dotenv";
import { getSheetData, appendRow, updateCell, deleteRow } from "./sheetsService.js";

dotenv.config();

const SHEET_NAME = "Usuarios";

/**
 * =====================================================
 * 🔹 Obtener todos los usuarios
 * =====================================================
 */
export async function getAllUsers() {
  const rows = await getSheetData(SHEET_NAME);
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim().toLowerCase()] = r[i] || ""));
    return obj;
  });
}

/**
 * =====================================================
 * 🔹 Crear nuevo usuario
 * =====================================================
 * @param {Object} user { nombre, usuario, contrasena, rol }
 */
export async function createUser(user) {
  if (!user?.nombre || !user?.usuario || !user?.contrasena || !user?.rol) {
    throw new Error("Datos incompletos para crear usuario");
  }
  const nuevaFila = [user.nombre, user.usuario, user.contrasena, user.rol];
  await appendRow(SHEET_NAME, nuevaFila);
  console.log(`✅ Usuario creado: ${user.usuario}`);
}

/**
 * =====================================================
 * 🔹 Actualizar usuario
 * =====================================================
 * @param {string} usuario - nombre del usuario (clave única)
 * @param {Object} data - campos a actualizar
 */
export async function updateUser(usuario, data) {
  const rows = await getSheetData(SHEET_NAME);
  const headers = rows[0];
  const idxUsuario = headers.findIndex((h) => /usuario/i.test(h));
  if (idxUsuario < 0) throw new Error("No se encontró columna usuario");

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idxUsuario] || "").trim().toLowerCase() === usuario.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex < 0) throw new Error("Usuario no encontrado");

  const campos = { nombre: data.nombre, contrasena: data.contrasena, rol: data.rol };
  for (const [key, value] of Object.entries(campos)) {
    if (!value) continue;
    const colIdx = headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());
    if (colIdx >= 0) {
      const letra = String.fromCharCode("A".charCodeAt(0) + colIdx);
      await updateCell(SHEET_NAME, `${SHEET_NAME}!${letra}${rowIndex}`, value);
    }
  }

  console.log(`✏️ Usuario actualizado: ${usuario}`);
}

/**
 * =====================================================
 * 🔹 Eliminar usuario
 * =====================================================
 * @param {string} usuario - identificador del usuario a borrar
 */
export async function deleteUser(usuario) {
  const rows = await getSheetData(SHEET_NAME);
  const headers = rows[0];
  const idxUsuario = headers.findIndex((h) => /usuario/i.test(h));
  if (idxUsuario < 0) throw new Error("No se encontró columna usuario");

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][idxUsuario] || "").trim().toLowerCase() === usuario.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex < 0) throw new Error("Usuario no encontrado");
  await deleteRow(SHEET_NAME, rowIndex);

  console.log(`🗑️ Usuario eliminado: ${usuario}`);
}
