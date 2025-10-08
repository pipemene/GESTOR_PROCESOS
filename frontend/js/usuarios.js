
// usuarios.js - módulo de gestión de usuarios (versión final)
document.addEventListener("DOMContentLoaded", () => {
  const btnLoadUsers = document.getElementById("btnLoadUsers");
  const contenedor = document.getElementById("usuariosContainer");

  if (!btnLoadUsers || !contenedor) {
    console.log("ℹ Página sin módulo de usuarios, ejecución omitida.");
    return;
  }

  async function cargarUsuarios() {
    try {
      const res = await fetch("/api/listUsers");
      const data = await res.json();
      contenedor.innerHTML = "";

      if (!data || !Array.isArray(data)) {
        contenedor.innerHTML = "<p>No hay usuarios registrados.</p>";
        return;
      }

      data.forEach(u => {
        const fila = document.createElement("div");
        fila.className = "usuario-item";
        fila.innerHTML = `<div><strong>${u.Usuario}</strong> (${u.Rol})</div>`;
        contenedor.appendChild(fila);
      });
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      alert("❌ No se pudieron cargar los usuarios.");
    }
  }

  btnLoadUsers.addEventListener("click", cargarUsuarios);
});
