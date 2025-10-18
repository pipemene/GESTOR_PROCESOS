<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Iniciar Sesión | Blue Home Gestor</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #003366 0%, #006bb3 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .login-card {
      background: #fff;
      border-radius: 15px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .login-card h3 {
      color: #003366;
      font-weight: bold;
      margin-bottom: 25px;
    }
    .logo {
      width: 100px;
      display: block;
      margin: 0 auto 20px;
    }
  </style>
</head>

<body>
  <div class="login-card text-center">
    <img src="https://i.imgur.com/FEBvZ6N.png" alt="Logo Blue Home" class="logo" />
    <h3>Acceso al Gestor Blue Home</h3>

    <form id="loginForm">
      <div class="mb-3 text-start">
        <label for="usuario" class="form-label fw-semibold">Usuario</label>
        <input type="text" class="form-control" id="usuario" placeholder="Ej. dayan" required>
      </div>
      <div class="mb-3 text-start">
        <label for="contrasena" class="form-label fw-semibold">Contraseña</label>
        <input type="password" class="form-control" id="contrasena" placeholder="********" required>
      </div>
      <button type="submit" class="btn btn-primary w-100 mt-3">Ingresar</button>
    </form>

    <div id="msgError" class="text-danger mt-3 fw-semibold"></div>
  </div>

  <script>
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim().toLowerCase();
    const contrasena = document.getElementById("contrasena").value.trim();
    const msg = document.getElementById("msgError");

    msg.textContent = "Verificando...";
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena })
      });

      const data = await res.json();
      if (!data.ok) {
        msg.textContent = data.error || "❌ Usuario o contraseña incorrectos.";
        return;
      }

      // Guardar sesión local
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuarioActivo", JSON.stringify(data.user));

      msg.textContent = "✅ Bienvenido, " + data.user.nombre;

      // Redirigir según rol
      const rol = data.user.rol.toLowerCase();
      setTimeout(() => {
        if (rol === "superadmin") window.location.href = "admin.html";
        else if (rol === "reparaciones") window.location.href = "reparaciones.html";
        else if (rol === "arrendamiento") window.location.href = "arrendamiento.html";
        else if (rol === "facturacion" || rol === "contabilidad") window.location.href = "facturacion.html";
        else window.location.href = "dashboard.html";
      }, 600);
    } catch (err) {
      msg.textContent = "⚠️ Error conectando con el servidor.";
      console.error(err);
    }
  });
  </script>

  <script>
  // 🕒 Expiración automática de sesión (10 min)
  let tiempoInactividad;
  const TIEMPO_LIMITE = 10 * 60 * 1000; // 10 minutos

  function reiniciarTemporizador() {
    clearTimeout(tiempoInactividad);
    tiempoInactividad = setTimeout(() => {
      alert("⚠️ Tu sesión ha expirado por inactividad.");
      localStorage.clear();
      window.location.href = "index.html";
    }, TIEMPO_LIMITE);
  }

  // Detectar actividad del usuario
  ["click", "mousemove", "keypress", "scroll", "touchstart"].forEach(evt =>
    document.addEventListener(evt, reiniciarTemporizador)
  );

  reiniciarTemporizador();
  </script>
</body>
</html>
