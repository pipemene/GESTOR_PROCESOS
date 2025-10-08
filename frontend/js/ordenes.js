
// ordenes.js - módulo de gestión de órdenes (versión final)
document.addEventListener("DOMContentLoaded", () => {
  const btnCargar = document.getElementById("btnCargar");
  const btnNueva = document.getElementById("btnNuevaOrden");
  const contenedor = document.getElementById("ordenesContainer");

  if (!btnCargar || !btnNueva || !contenedor) {
    console.log("ℹ Página sin módulo de órdenes, ejecución omitida.");
    return;
  }

  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/listOrders");
      const data = await res.json();
      contenedor.innerHTML = "";

      if (!data || !Array.isArray(data)) {
        contenedor.innerHTML = "<p>No hay órdenes registradas.</p>";
        return;
      }

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
      alert("❌ No se pudieron cargar las órdenes.");
    }
  }

  async function crearOrden() {
    const descripcion = prompt("Descripción de la orden:");
    if (!descripcion) return;
    try {
      const res = await fetch("/api/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion })
      });
      const data = await res.json();
      if (data.status === "ok") {
        alert("✅ Orden creada correctamente.");
        cargarOrdenes();
      } else {
        alert("❌ Error al crear la orden.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error de conexión al crear la orden.");
    }
  }

  contenedor.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btnEliminar")) {
      const id = e.target.dataset.id;
      if (confirm(`¿Eliminar la orden ${id}?`)) {
        try {
          await fetch("/api/deleteOrder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ radicado: id })
          });
          alert("🗑 Orden eliminada.");
          cargarOrdenes();
        } catch (err) {
          alert("❌ Error eliminando la orden.");
        }
      }
    }
  });

  btnCargar.addEventListener("click", cargarOrdenes);
  btnNueva.addEventListener("click", crearOrden);
});
