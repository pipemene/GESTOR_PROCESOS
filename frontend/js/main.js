document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 BlueHome Gestor de Procesos v3.3 listo ✅");

  const btnLogin = document.getElementById("btnLogin");
  const btnTest = document.getElementById("btnTest");

  if (btnLogin) {
    console.log("✅ Botón de login detectado");
    btnLogin.addEventListener("click", async () => {
      const usuario = document.getElementById("usuario").value.trim();
      const clave = document.getElementById("clave").value.trim();
      if (!usuario || !clave) return alert("Por favor, completa los campos");

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, clave }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("usuario", data.usuario);
          localStorage.setItem("rol", data.rol);
          window.location.href = "/ordenes";
        } else {
          alert("❌ Usuario o clave incorrectos");
        }
      } catch (err) {
        console.error("Error en login:", err);
        alert("⚠️ No se pudo conectar al servidor");
      }
    });
  } else {
    console.log("⚠️ Botón de login no detectado");
  }

  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/test");
        const data = await res.json();
        alert("✅ Conexión exitosa\n" + JSON.stringify(data, null, 2));
      } catch (err) {
        alert("❌ No se pudo conectar con el servidor");
        console.error(err);
      }
    });
  }
});
