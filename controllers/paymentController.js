const db = require('../config/db');

// Registrar un pago
const createPayment = (req, res) => {
    const { order_id, payment_method, transaction_id } = req.body;

    db.query('INSERT INTO payments (order_id, payment_method, transaction_id, status) VALUES (?, ?, ?, "pending")', 
        [order_id, payment_method, transaction_id], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Pago registrado correctamente" });
        });
};

// Obtener pagos de un usuario
const getPayments = (req, res) => {
    db.query('SELECT * FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', 
        [req.user.id], 
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
    });
};

module.exports = { createPayment, getPayments };
