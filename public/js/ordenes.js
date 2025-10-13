document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formOrden");
  const btnCrear = document.getElementById("btnCrearOrden");
  const tabla = document.querySelector("#tablaOrdenes tbody");
  const mensaje = document.getElementById("mensaje");

  // 🔄 Cargar órdenes existentes
  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Error al obtener órdenes");

      const data = await res.json();
      tabla.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay órdenes registradas</td></tr>`;
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
          <td>${o.observacion || ""}</td>
        `;
        tabla.appendChild(fila);
      });
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      tabla.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error cargando órdenes</td></tr>`;
    }
  }

  // 🚀 Enviar formulario para crear orden
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    btnCrear.disabled = true;
    btnCrear.textContent = "Creando...";

    const datos = {
      codigo: document.getElementById("codigo").value.trim(),
      arrendatario: document.getElementById("arrendatario").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      tecnico: document.getElementById("tecnico").value,
      observacion: document.getElementById("observacion").value.trim(),
    };

    console.log("📤 Enviando datos:", datos);

    if (!datos.codigo || !datos.arrendatario) {
      mostrarMensaje("⚠️ Código y Arrendatario son obligatorios", "error");
      btnCrear.disabled = false;
      btnCrear.textContent = "💾 Crear Orden";
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const respuesta = await res.json();
      console.log("📥 Respuesta servidor:", respuesta);

      if (res.ok) {
        mostrarMensaje("✅ Orden creada correctamente", "exito");
        form.reset();
        await cargarOrdenes(); // refrescar tabla
      } else {
        mostrarMensaje(`❌ Error: ${respuesta.error || "No se pudo crear la orden"}`, "error");
      }
    } catch (err) {
      mostrarMensaje("❌ Error de conexión con el servidor", "error");
      console.error("Error en la creación:", err);
    } finally {
      btnCrear.disabled = false;
      btnCrear.textContent = "💾 Crear Orden";
    }
  });

  // 💬 Mostrar mensajes en pantalla
  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = "block";

    setTimeout(() => {
      mensaje.style.display = "none";
    }, 3500);
  }

  // 🔁 Cargar al iniciar
  cargarOrdenes();
});
