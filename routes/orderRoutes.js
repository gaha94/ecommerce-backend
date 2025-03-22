const express = require('express');
const { check, validationResult } = require('express-validator');
const { createOrder, getOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Validaciones para crear una orden
router.post('/checkout', protect, [
    check('user_id', 'El ID del usuario es obligatorio y debe ser un número').isInt(),
    check('total', 'El total debe ser un número válido y mayor que 0').isFloat({ min: 0.1 }),
    check('products', 'Debe incluir al menos un producto').isArray({ min: 1 }),
    check('products.*.id', 'El ID del producto es obligatorio y debe ser un número').isInt(),
    check('products.*.quantity', 'La cantidad debe ser un número mayor a 0').isInt({ min: 1 }),
    check('products.*.price', 'El precio del producto debe ser un número mayor a 0').isFloat({ min: 0.1 }),
    check('address.recipient_name', 'El nombre del destinatario es obligatorio').not().isEmpty(),
    check('address.phone', 'El teléfono es obligatorio y debe tener al menos 9 dígitos').isLength({ min: 9 }),
    check('address.address', 'La dirección es obligatoria').not().isEmpty(),
    check('address.city', 'La ciudad es obligatoria').not().isEmpty(),
    check('address.country', 'El país es obligatorio').not().isEmpty()
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}, createOrder);

router.get('/', protect, getOrders);

module.exports = router;
