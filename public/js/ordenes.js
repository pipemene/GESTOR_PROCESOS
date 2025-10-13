document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formOrden");
  const btnCrear = document.getElementById("btnCrearOrden");
  const tabla = document.querySelector("#tablaOrdenes tbody");
  const mensaje = document.getElementById("mensaje");

  // 🔄 Cargar órdenes desde el backend
  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      tabla.innerHTML = "";

      if (!data.length) {
        tabla.innerHTML = `<tr><td colspan="7">No hay órdenes registradas</td></tr>`;
        return;
      }

      data.forEach((o) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${o.codigo || "-"}</td>
          <td>${o.arrendatario || "-"}</td>
          <td>${o.telefono || "-"}</td>
          <td>${o.tecnico || "-"}</td>
          <td>${o.estado || "-"}</td>
          <td>${o.observacion || "-"}</td>
          <td><button class="btn-ver" data-codigo="${o.codigo}">🔍 Ver</button></td>
        `;
        tabla.appendChild(fila);
      });

      // 🧭 Redirigir al detalle
      document.querySelectorAll(".btn-ver").forEach((btn) => {
        btn.addEventListener("click", () => {
          const codigo = btn.dataset.codigo;
          if (codigo) {
            window.location.href = `/orden_detalle.html?codigo=${encodeURIComponent(codigo)}`;
          }
        });
      });
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      tabla.innerHTML = `<tr><td colspan="7">Error al cargar órdenes</td></tr>`;
    }
  }

  // 🚀 Crear nueva orden
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
        mostrarMensaje(`❌ Error: ${respuesta.error || "No se pudo crear la orden"}`, "error");
      }
    } catch (err) {
      mostrarMensaje("❌ Error de conexión con el servidor", "error");
      console.error(err);
    } finally {
      btnCrear.disabled = false;
      btnCrear.textContent = "Crear Orden";
    }
  });

  // 💬 Mostrar mensajes de estado
  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = tipo === "exito" ? "mensaje exito" : "mensaje error";
    mensaje.style.display = "block";
    setTimeout(() => (mensaje.style.display = "none"), 3000);
  }

  cargarOrdenes();
});
