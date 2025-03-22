const express = require('express');
const { createProduct, updateProduct, deleteProduct } = require('../controllers/productAdminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, adminOnly, createProduct);
router.put('/', protect, adminOnly, updateProduct);
router.delete('/:product_id', protect, adminOnly, deleteProduct);

module.exports = router;
