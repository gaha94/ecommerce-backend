const db = require('../config/db');

// Obtener todas las órdenes con datos del usuario y estado
const getAllOrders = (req, res) => {
    const query = `
        SELECT o.id, o.total, o.created_at, u.name AS customer, s.name AS status
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_statuses s ON o.status_id = s.id
        ORDER BY o.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Obtener detalles de una orden (con estado e invoice_type)
const getOrderDetails = (req, res) => {
    const orderId = req.params.id;

    const orderQuery = `
        SELECT o.id, o.total, o.created_at, u.name AS customer, s.name AS status
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_statuses s ON o.status_id = s.id
        WHERE o.id = ?
    `;

    const productsQuery = `
        SELECT p.name AS product_name, od.quantity, od.price, od.subtotal
        FROM order_details od
        JOIN products p ON od.product_id = p.id
        WHERE od.order_id = ?
    `;

    const addressQuery = `
        SELECT recipient_name, phone, address, city, country
        FROM order_addresses
        WHERE order_id = ?
    `;

    const invoiceQuery = `
        SELECT t.name AS invoice_type, i.invoice_number, i.document_number, i.business_name
        FROM invoices i
        JOIN invoice_types t ON i.invoice_type_id = t.id
        WHERE i.order_id = ?
    `;

    db.query(orderQuery, [orderId], (err, orderResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orderResult.length === 0) return res.status(404).json({ message: 'Orden no encontrada' });

        db.query(productsQuery, [orderId], (err, products) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(addressQuery, [orderId], (err, address) => {
                if (err) return res.status(500).json({ error: err.message });

                db.query(invoiceQuery, [orderId], (err, invoice) => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.json({
                        order: orderResult[0],
                        products,
                        shipping_address: address[0] || null,
                        invoice: invoice[0] || null
                    });
                });
            });
        });
    });
};

// Cambiar el estado de una orden
const updateOrderStatus = (req, res) => {
    const { id, status_id } = req.body;
    const changedBy = req.user.id; // <-- ID del admin autenticado

    // Validar que el status_id exista
    db.query('SELECT id FROM order_statuses WHERE id = ?', [status_id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(400).json({ message: 'Estado no válido' });
        }

        // Actualizar orden
        db.query('UPDATE orders SET status_id = ? WHERE id = ?', [status_id, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Insertar en historial
            db.query(
                'INSERT INTO order_status_history (order_id, status_id, changed_by) VALUES (?, ?, ?)',
                [id, status_id, changedBy],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    res.json({ message: 'Estado actualizado y registrado en historial' });
                }
            );
        });
    });
};


// Obtener órdenes con filtros por estado, fecha o cliente
const filterOrders = (req, res) => {
    const { estado, desde, hasta, cliente } = req.query;

    let query = `
        SELECT o.id, o.total, o.created_at, u.name AS customer, s.name AS status
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_statuses s ON o.status_id = s.id
        WHERE 1=1
    `;

    const params = [];

    if (estado) {
        query += " AND s.name = ?";
        params.push(estado);
    }

    if (desde && hasta) {
        query += " AND DATE(o.created_at) BETWEEN ? AND ?";
        params.push(desde, hasta);
    }

    if (cliente) {
        query += " AND u.name LIKE ?";
        params.push(`%${cliente}%`);
    }

    query += " ORDER BY o.created_at DESC";

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Reporte de total de ventas por mes (solo estados enviados y entregados)
const getSalesReport = (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(o.created_at, '%Y-%m') AS mes,
            COUNT(*) AS cantidad_ordenes,
            SUM(o.total) AS total_ventas
        FROM orders o
        JOIN order_statuses s ON o.status_id = s.id
        WHERE s.name IN ('enviada', 'entregada')
        GROUP BY mes
        ORDER BY mes DESC
        LIMIT 12
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Obtener historial de estados de una orden
const getOrderStatusHistory = (req, res) => {
    const orderId = req.params.id;

    const query = `
        SELECT s.name AS status, u.name AS changed_by, h.changed_at
        FROM order_status_history h
        JOIN order_statuses s ON h.status_id = s.id
        JOIN users u ON h.changed_by = u.id
        WHERE h.order_id = ?
        ORDER BY h.changed_at ASC
    `;

    db.query(query, [orderId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

const anularOrden = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;

  console.log(`🛑 Iniciando anulación para la orden ID: ${orderId}`);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. Verificar que la orden exista
    const [[orden]] = await conn.query(
      `SELECT id, status_id FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!orden) {
      await conn.rollback();
      console.warn('⚠️ Orden no encontrada');
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // 2. Verificar estado actual
    const [[estado]] = await conn.query(
      'SELECT name FROM order_statuses WHERE id = ?',
      [orden.status_id]
    );

    if (!estado || estado.name === 'cancelada') {
      await conn.rollback();
      console.warn('⚠️ La orden ya está cancelada');
      return res.status(400).json({ message: 'La orden ya está cancelada' });
    }

    console.log(`🔁 Estado actual: ${estado.name}`);

    // 3. Actualizar estado a cancelada (ID 5)
    await conn.query(
      'UPDATE orders SET status_id = ? WHERE id = ?',
      [5, orderId]
    );

    console.log('✅ Estado actualizado a cancelada');

    // 4. Registrar en historial
    await conn.query(
      'INSERT INTO order_status_history (order_id, status_id, changed_by) VALUES (?, ?, ?)',
      [orderId, 5, userId]
    );

    console.log('📝 Historial actualizado');

    // 5. Recuperar detalles y reintegrar stock
    const [productos] = await conn.query(
      `SELECT product_id, quantity FROM order_details WHERE order_id = ?`,
      [orderId]
    );

    for (const p of productos) {
      await conn.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [p.quantity, p.product_id]
      );
    }

    console.log('📦 Stock reintegrado');

    await conn.commit();
    res.json({ message: 'Orden anulada y stock reintegrado correctamente' });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ Error al anular orden:', err.message);
    res.status(500).json({ message: 'Error al anular la orden', error: err.message });
  } finally {
    if (conn) conn.release();
  }
};  

module.exports = {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    filterOrders,
    getSalesReport,
    getOrderStatusHistory,
    anularOrden
};
