export function verificarSesion(req, res, next) {
  const token = req.headers["x-user-token"];
  if (!token) return res.status(401).json({ error: "No autorizado. Token faltante." });

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const user = JSON.parse(decoded);
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Error al verificar sesión:", err);
    res.status(401).json({ error: "Token inválido o corrupto." });
  }
}
