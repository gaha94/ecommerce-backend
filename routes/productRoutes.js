const express = require('express');
const router = express.Router();
const { crearProducto, getProducts } = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para obtener productos (pública)
router.get('/', getProducts);

// Ruta protegida por roles
router.post('/crear-producto', protect, authorizeRoles('admin', 'editor'), crearProducto);

module.exports = router;
