const express = require('express');
const router = express.Router();
const {
  crearProducto,
  getProducts,
  getProductById // ✅ nuevo controlador
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta pública para obtener todos los productos (con filtros y paginación)
router.get('/', getProducts);

// Ruta pública para obtener un producto por su ID
router.get('/:id', getProductById); // ✅ nueva ruta

// Ruta protegida para crear productos (solo admin o editor)
router.post('/crear-producto', protect, authorizeRoles('admin', 'editor'), crearProducto);

module.exports = router;
