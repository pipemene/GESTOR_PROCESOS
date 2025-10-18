// middleware/protegerRutas.js
export function protegerRutas(rolesPermitidos = []) {
  return (req, res, next) => {
    try {
      const token = req.headers["x-user-token"];
      if (!token) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const user = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
      const rolUsuario = user.rol?.toLowerCase();

      if (!rolesPermitidos.includes(rolUsuario)) {
        console.warn(`🚫 Acceso denegado para rol: ${rolUsuario}`);
        return res.status(403).json({ error: "Acceso denegado" });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("❌ Error en protegerRutas:", err);
      res.status(401).json({ error: "Token inválido o corrupto" });
    }
  };
}
