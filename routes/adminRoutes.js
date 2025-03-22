const express = require('express');
const { getAllUsers, updateUserRole, deleteUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users', protect, adminOnly, getAllUsers);
router.put('/users/role', protect, adminOnly, updateUserRole);
router.delete('/users/:user_id', protect, adminOnly, deleteUser);

module.exports = router;
