
// ordenes.js - módulo de gestión de órdenes
document.addEventListener("DOMContentLoaded", () => {
  const btnCargar = document.getElementById("btnCargar");
  const btnNueva = document.getElementById("btnNuevaOrden");
  const contenedor = document.getElementById("ordenesContainer");

  if (!btnCargar || !btnNueva || !contenedor) {
    console.log("Página sin módulo de órdenes, se omite ejecución.");
    return;
  }

  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/listOrders");
      const data = await res.json();
      if (!data || !Array.isArray(data)) throw new Error("Respuesta inválida");
      contenedor.innerHTML = "";
      data.forEach(ord => {
        const fila = document.createElement("div");
        fila.className = "orden-item";
        fila.innerHTML = `
          <div><strong>${ord.Radicado}</strong> - ${ord.Inquilino}</div>
          <div>${ord.Descripcion}</div>
          <div>${ord.Tecnico || "Sin asignar"}</div>
          <div>${ord.Estado}</div>
          <button class="btnEditar" data-id="${ord.Radicado}">Editar</button>
          <button class="btnEliminar" data-id="${ord.Radicado}">Eliminar</button>
        `;
        contenedor.appendChild(fila);
      });
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      alert("No se pudieron cargar las órdenes.");
    }
  }

  async function crearOrden() {
    const descripcion = prompt("Descripción de la orden:");
    if (!descripcion) return;
    try {
      await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion })
      });
      alert("Orden creada correctamente.");
      cargarOrdenes();
    } catch (err) {
      console.error(err);
      alert("Error al crear la orden.");
    }
  }

  contenedor.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btnEliminar")) {
      const id = e.target.dataset.id;
      if (confirm(`¿Eliminar la orden ${id}?`)) {
        await fetch(`/api/deleteOrder/${id}`, { method: "DELETE" });
        cargarOrdenes();
      }
    }
  });

  btnCargar.addEventListener("click", cargarOrdenes);
  btnNueva.addEventListener("click", crearOrden);
});
