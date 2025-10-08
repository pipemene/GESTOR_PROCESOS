document.addEventListener("DOMContentLoaded", () => {
  console.log("Gestor BlueHome listo ✅");
  const btnLogin = document.getElementById("btnLogin");
  const btnTest = document.getElementById("btnTest");

  if (btnLogin) {
    console.log("Botón de login detectado");
    btnLogin.addEventListener("click", async () => {
      const usuario = document.getElementById("usuario").value.trim();
      const clave = document.getElementById("clave").value.trim();
      if (!usuario || !clave) {
        alert("Completa usuario y clave");
        return;
      }
      try {
        const r = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, clave })
        });
        const data = await r.json();
        alert("Respuesta: " + JSON.stringify(data));
      } catch (e) {
        alert("Error de conexión: " + e.message);
      }
    });
  }

  if (btnTest) {
    btnTest.addEventListener("click", async () => {
      const r = await fetch("/api/test");
      const d = await r.json();
      alert("Servidor respondió: " + JSON.stringify(d));
    });
  }
});