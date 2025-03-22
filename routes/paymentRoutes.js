const express = require('express');
const { check, validationResult } = require('express-validator');
const { createPayment, getPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Validaciones para crear un pago
router.post('/', protect, [
    check('order_id', 'El ID de la orden es obligatorio y debe ser un número').isInt(),
    check('payment_method', 'El método de pago es obligatorio').isIn(['credit_card', 'paypal', 'bank_transfer', 'cash']),
    check('transaction_id', 'El ID de la transacción es obligatorio').not().isEmpty()
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}, createPayment);

router.get('/', protect, getPayments);

module.exports = router;
