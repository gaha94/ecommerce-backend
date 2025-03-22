const express = require('express');
const {
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  filterOrders,
  getSalesReport,
  getOrderStatusHistory,
  anularOrden // <-- nueva función
} = require('../controllers/adminOrderController');

const { protect, adminOnly, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Filtros y reportes
router.get('/filtrar', protect, adminOnly, filterOrders);
router.get('/reporte/mensual', protect, adminOnly, getSalesReport);

// Nueva ruta para anulación (solo admin o soporte)
router.delete('/anular/:id', protect, authorizeRoles('admin', 'seller'), anularOrden);

router.get('/:id/historial', protect, adminOnly, getOrderStatusHistory);

router.put('/status', protect, adminOnly, updateOrderStatus);

// Órdenes
router.get('/', protect, adminOnly, getAllOrders);
router.get('/:id', protect, adminOnly, getOrderDetails);
router.get('/test', (req, res) => {
    console.log('✅ Test alcanzado');
    res.send('Ruta activa');
  });


module.exports = router;
