
// main.js - configuración general del sistema
document.addEventListener("DOMContentLoaded", () => {
  console.log("BlueHome Gestor de Procesos v3.3 listo");

  const user = localStorage.getItem("usuario") || "Desconocido";
  const userDisplay = document.querySelector("#userDisplay");
  if (userDisplay) userDisplay.innerText = user;

  // Evitar errores en páginas sin botones específicos
  const btnCargar = document.getElementById("btnCargar");
  const btnNueva = document.getElementById("btnNuevaOrden");

  if (btnCargar) console.log("Botón cargar detectado");
  if (btnNueva) console.log("Botón nueva orden detectado");
});
