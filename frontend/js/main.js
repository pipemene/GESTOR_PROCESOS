
// main.js - configuración general
document.addEventListener("DOMContentLoaded", () => {
  console.log("BlueHome Gestor de Procesos v3.3 listo");
  const user = localStorage.getItem("usuario") || "Desconocido";
  document.querySelector("#userDisplay")?.innerText = user;
});
