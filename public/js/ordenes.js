document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const btnCrear = form.querySelector("button[type='submit']");
  const tabla = document.querySelector("#tablaOrdenes tbody");
  const mensaje = document.getElementById("mensaje");

  // 🔄 Cargar órdenes existentes
  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      tabla.innerHTML = "";

      if (!data.length) {
        tabla.innerHTML = `<tr><td colspan="5">No hay órdenes registradas</td></tr>`;
        return;
      }

      data.forEach((o) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${o.codigo || ""}</td>
          <td>${o.arrendatario || ""}</td>
          <td>${o.telefono || ""}</td>
          <td>${o.tecnico || ""}</td>
          <td>${o.observacion || ""}</td>
        `;
        tabla.appendChild(fila);
      });
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      tabla.innerHTML = `<tr><td colspan="5">Error cargando órdenes</td></tr>`;
    }
  }

  // 🚀 Crear orden
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    btnCrear.disabled = true;
    btnCrear.textContent = "Creando...";

    // Tomar los valores REALES del formulario según tu HTML
    const datos = {
      codigo: document.getElementById("codigo").value.trim(),
      arrendatario: document.getElementById("arrendatario").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      tecnico: document.getElementById("tecnico").value,
      observacion: document.getElementById("observacion").value.trim(),
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
        await cargarOrdenes(); // refrescar tabla
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

  // 💬 Mostrar mensaje visual
  function mostrarMensaje(texto, tipo) {
    if (!mensaje) return alert(texto); // fallback si el div no existe
    mensaje.textContent = texto;
    mensaje.className = tipo === "exito" ? "mensaje exito" : "mensaje error";
    mensaje.style.display = "block";
    setTimeout(() => {
      mensaje.style.display = "none";
    }, 3000);
  }

  cargarOrdenes();
});
