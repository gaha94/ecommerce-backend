const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generar Token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Registrar usuario con manejo de errores
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) return next(err); // Enviar error al middleware
            if (results.length > 0) {
                res.status(400);
                return next(new Error("El usuario ya existe"));
            }

            // Encriptar contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar usuario
            db.query('INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, 2)', 
                [name, email, hashedPassword], 
                (err, result) => {
                    if (err) return next(err);
                    res.status(201).json({ message: "Usuario registrado correctamente" });
                }
            );
        });
    } catch (error) {
        next(error);
    }
};

// Iniciar sesión con manejo de errores
const loginUser = async (req, res, next) => {
    try {
        console.log("🔑 Login recibido"); // 👈 Para verificar que entra

        const { email, password } = req.body;

        // 1. Buscar usuario
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }

        const user = results[0];

        // 2. Comparar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Contraseña incorrecta" });
        }

        // 3. Responder con token
        res.json({
            message: "Inicio de sesión exitoso",
            token: generateToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role_id: user.role_id
            }
        });

    } catch (error) {
        console.error("❌ Error en login:", error.message);
        next(error);
    }
};

module.exports = { registerUser, loginUser };
