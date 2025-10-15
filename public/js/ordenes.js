document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formOrden");
  const btnCrear = document.getElementById("btnCrearOrden");
  const tabla = document.querySelector("#tablaOrdenes tbody");
  const mensaje = document.getElementById("mensaje");
  const btnVolver = document.getElementById("btnVolverDashboard");

  // 🔙 Botón volver al dashboard
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      window.location.href = "/dashboard.html";
    });
  }

  // 🔄 Cargar órdenes existentes
  async function cargarOrdenes() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      tabla.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7">No hay órdenes registradas</td></tr>`;
        return;
      }

      data.forEach((o) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${o.codigo || "—"}</td>
          <td>${o.arrendatario || "—"}</td>
          <td>${o.telefono || "—"}</td>
          <td>${o.tecnico || "—"}</td>
          <td>${o.estado || "Pendiente"}</td>
          <td>${o.observacion || "—"}</td>
          <td><button class="btn-ver" data-codigo="${o.codigo}">🔍 Ver</button></td>
        `;
        tabla.appendChild(fila);
      });

      // 🔍 Abrir orden individual
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
      tabla.innerHTML = `<tr><td colspan="7">Error cargando órdenes</td></tr>`;
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
        mostrarMensaje(`❌ ${respuesta.error || "Error al crear orden"}`, "error");
      }
    } catch (err) {
      mostrarMensaje("❌ Error de conexión con el servidor", "error");
      console.error(err);
    } finally {
      btnCrear.disabled = false;
      btnCrear.textContent = "Crear Orden";
    }
  });

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = tipo === "exito" ? "mensaje exito" : "mensaje error";
    mensaje.style.display = "block";
    setTimeout(() => (mensaje.style.display = "none"), 3000);
  }

  cargarOrdenes();
});
// Filtro por técnico desde querystring (?tecnico=Nombre)
function getQS(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) || "";
}

async function cargarOrdenes() {
  const tbody = document.querySelector("#tablaOrdenes tbody");
  tbody.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;

  try {
    const res = await fetch("/api/orders");
    const data = await res.json();

    const tecnicoQS = getQS("tecnico"); // p.ej. Mauricio
    let filtradas = data;

    if (tecnicoQS) {
      filtradas = data.filter(o => {
        const t = (o.Tecnico || o["Tecnico"] || "").trim();
        return t === "Sin asignar" || t === tecnicoQS;
      });
    }

    if (!filtradas.length) {
      tbody.innerHTML = `<tr><td colspan="7">No hay órdenes registradas</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    filtradas.forEach(o => {
      const codigo = o["Codigo"] || o["Código"] || "";
      const arr = o["Inquilino"] || o["Arrendatario"] || "";
      const tel = o["Telefono"] || o["Teléfono"] || "";
      const tec = o["Tecnico"] || "Sin asignar";
      const est = o["Estado"] || "Pendiente";
      const desc = o["Descripcion"] || "";

      const verHref = `/orden.html?codigo=${encodeURIComponent(codigo)}${tecnicoQS ? `&tecnico=${encodeURIComponent(tecnicoQS)}` : ""}`;

      const btnAsignarme = (tecnicoQS && tec === "Sin asignar")
        ? `<button class="btn-ver" data-asignar="${codigo}">Asignarme</button>`
        : `<a class="btn-ver" href="${verHref}">Ver</a>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${codigo || "—"}</td>
        <td>${arr || "—"}</td>
        <td>${tel || "—"}</td>
        <td>${tec || "—"}</td>
        <td>${est || "Pendiente"}</td>
        <td>${desc || "—"}</td>
        <td>${btnAsignarme}</td>
      `;
      tbody.appendChild(tr);
    });

    // Delegado: asignarme
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-asignar]");
      if (!btn) return;
      const codigo = btn.getAttribute("data-asignar");
      const tecnico = getQS("tecnico");
      if (!tecnico) return alert("No se detectó el técnico en la URL (?tecnico=Nombre).");

      btn.disabled = true;
      btn.textContent = "Asignando...";
      try {
        const r = await fetch(`/api/orders/${encodeURIComponent(codigo)}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tecnico })
        });
        if (!r.ok) throw new Error("No se pudo asignar");
        await cargarOrdenes();
      } catch (err) {
        alert("Error al asignar la orden.");
      }
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Error cargando órdenes</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarOrdenes);
