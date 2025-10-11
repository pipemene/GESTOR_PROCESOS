document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-orden");
  const inputCodigo = document.getElementById("codigo");
  const inputArrendatario = document.getElementById("arrendatario");
  const inputTelefono = document.getElementById("telefono");
  const inputDescripcion = document.getElementById("descripcion");
  const selectTecnico = document.getElementById("tecnico");
  const tablaBody = document.getElementById("tabla-ordenes-body");

  // ✅ Cargar órdenes registradas al inicio
  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      const ordenes = await res.json();
      tablaBody.innerHTML = "";

      if (ordenes.length === 0) {
        tablaBody.innerHTML = `
          <tr><td colspan="6" class="text-center text-gray-400">No hay órdenes registradas.</td></tr>`;
        return;
      }

      ordenes.forEach((orden) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${orden.codigo}</td>
          <td>${orden.arrendatario}</td>
          <td>${orden.telefono}</td>
          <td>${orden.tecnico || "Sin asignar"}</td>
          <td>${orden.estado || "Pendiente"}</td>
          <td>${orden.descripcion || ""}</td>
          <td><a href="/orden_detalle.html?codigo=${orden.codigo}" class="btn btn-sm btn-primary">Ver / Gestionar</a></td>
        `;
        tablaBody.appendChild(fila);
      });
    } catch (error) {
      console.error("❌ Error al cargar las órdenes:", error);
    }
  }

  await cargarOrdenes();

  // ✅ Crear nueva orden
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigoInmueble = inputCodigo.value.trim();
    const arrendatario = inputArrendatario.value.trim();
    const telefono = inputTelefono.value.trim();
    const descripcion = inputDescripcion.value.trim();
    const tecnico = selectTecnico.value || "Sin asignar";

    // ⚠️ Validar campos obligatorios
    if (!codigoInmueble || !arrendatario || !telefono) {
      alert("⚠️ Faltan datos obligatorios: Código, Arrendatario o Teléfono.");
      return;
    }

    const nuevaOrden = {
      codigoInmueble,
      arrendatario,
      telefono,
      descripcion,
      tecnico,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaOrden),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Orden creada correctamente");
        form.reset();
        await cargarOrdenes();
      } else {
        alert(`❌ Error: ${data.message || "No se pudo crear la orden"}`);
      }
    } catch (error) {
      console.error("❌ Error al crear la orden:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
  });
});
