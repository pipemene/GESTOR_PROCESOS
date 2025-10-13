document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formOrden");
  const btnCrear = document.getElementById("btnCrearOrden");
  const tabla = document.getElementById("tablaOrdenes").querySelector("tbody");
  const mensaje = document.getElementById("mensaje");

  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      tabla.innerHTML = "";
      if (!data.length) {
        tabla.innerHTML = `<tr><td colspan="6">No hay órdenes registradas</td></tr>`;
        return;
      }
      data.forEach(o => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${o.codigo || ""}</td>
          <td>${o.arrendatario || ""}</td>
          <td>${o.telefono || ""}</td>
          <td>${o.tecnico || ""}</td>
          <td>${o.estado || "Pendiente"}</td>
          <td>${o.observacion || ""}</td>`;
        tabla.appendChild(fila);
      });
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      tabla.innerHTML = `<tr><td colspan="6">Error cargando órdenes</td></tr>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btnCrear.disabled = true;
    btnCrear.textContent = "Creando...";

    const datos = {
      codigo: form.codigo.value.trim(),
      arrendatario: form.arrendatario.value.trim(),
      telefono: form.telefono.value.trim(),
      tecnico: form.tecnico.value,
      observacion: form.observacion.value.trim(),
    };

    console.log("📤 Enviando datos:", datos);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const respuesta = await res.json();

      if (res.ok) {
        mostrarMensaje("✅ Orden creada correctamente", "exito");
        form.reset();
        await cargarOrdenes();
      } else {
        mostrarMensaje(`❌ Error: ${respuesta.message || "No se pudo crear la orden"}`, "error");
      }
    } catch (err) {
      mostrarMensaje("❌ Error de conexión con el servidor", "error");
      console.error(err);
    } finally {
      btnCrear.disabled = false;
      btnCrear.textContent = "💾 Crear Orden";
    }
  });

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = tipo === "exito" ? "mensaje exito" : "mensaje error";
    mensaje.style.display = "block";
    setTimeout(() => mensaje.style.display = "none", 4000);
  }

  cargarOrdenes();
});
