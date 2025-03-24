require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorMiddleware');

const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productAdminRoutes = require('./routes/productAdminRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/products', productAdminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/categories', categoryRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
