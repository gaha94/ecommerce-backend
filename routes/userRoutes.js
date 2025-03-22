const express = require('express');
const { check, validationResult } = require('express-validator');
const { registerUser, loginUser } = require('../controllers/userController');

const router = express.Router();

// Validaciones para el registro de usuario
router.post('/register', [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('email', 'Debe ser un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}, registerUser);

// Validaciones para el login de usuario
router.post('/login', [
    check('email', 'Debe ser un email válido').isEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty()
], (req, res, next) => {
    console.log('🔑 Login recibido');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}, loginUser);

module.exports = router;
