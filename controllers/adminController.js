const db = require('../config/db');

// Obtener todos los usuarios
const getAllUsers = (req, res) => {
    db.query('SELECT id, name, email, role_id FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Actualizar rol de un usuario
const updateUserRole = (req, res) => {
    const { user_id, role_id } = req.body;

    db.query('UPDATE users SET role_id = ? WHERE id = ?', [role_id, user_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Rol actualizado correctamente" });
    });
};

// Eliminar usuario
const deleteUser = (req, res) => {
    const { user_id } = req.params;

    db.query('DELETE FROM users WHERE id = ?', [user_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Usuario eliminado correctamente" });
    });
};

module.exports = { getAllUsers, updateUserRole, deleteUser };
