const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware para proteger rutas y validar JWT
const protect = (req, res, next) => {
  console.log('🛡️ Middleware protect → verificando token');
  let token = req.headers.authorization;

  if (!token) {
    console.log('🚫 Token no proporcionado');
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    token = token.split(" ")[1]; // "Bearer <token>"
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, role_id }
    console.log('✅ Token válido. Usuario:', decoded);
    next();
  } catch (error) {
    console.error('❌ Token inválido:', error.message);
    return res.status(401).json({ message: "Token inválido" });
  }
};

// Middleware para permitir solo admin (role_name = 'admin')
const adminOnly = (req, res, next) => {
  console.log('🔒 Verificando si es admin...');
  db.query(
    'SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('❌ Error en DB:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0 || results[0].role_name !== 'admin') {
        console.warn('⛔ Acceso denegado. Rol actual:', results[0]?.role_name);
        return res.status(403).json({ message: "Acceso denegado, solo administradores" });
      }

      console.log('✅ Usuario es admin');
      next();
    }
  );
};

// Middleware para múltiples roles (admin, soporte, etc)
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
      try {
        console.log('🔐 Verificando roles permitidos:', allowedRoles);
  
        const [results] = await db.query(
          'SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
          [req.user.id]
        );
  
        if (results.length === 0) {
          console.warn('❌ No se encontró ningún rol para este usuario');
          return res.status(403).json({ message: "Acceso denegado" });
        }
  
        const userRole = results[0].role_name;
        console.log('🔎 Rol del usuario:', userRole);
  
        if (!allowedRoles.includes(userRole)) {
          console.warn(`⛔ Rol no permitido: ${userRole}`);
          return res.status(403).json({ message: "Acceso denegado" });
        }
  
        console.log(`✅ Acceso autorizado para rol: ${userRole}`);
        next();
      } catch (err) {
        console.error('❌ Error en authorizeRoles:', err.message);
        return res.status(500).json({ message: "Error al verificar rol", error: err.message });
      }
    };
  };  

module.exports = {
  protect,
  adminOnly,
  authorizeRoles
};
