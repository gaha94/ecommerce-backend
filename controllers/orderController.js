const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const sendInvoiceEmail = require('../utils/emailService');

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Crear nueva orden con transacción y rollback en caso de error
const createOrder = async (req, res, next) => {
  const { user_id, products, total, address, invoice } = req.body;

  // ✅ VALIDACIONES PREVIAS
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'La orden debe contener al menos un producto.' });
  }

  if (!address || !address.recipient_name || !address.address || !address.city || !address.country) {
    return res.status(400).json({ message: 'La dirección de envío está incompleta.' });
  }

  if (
    !invoice ||
    !invoice.invoice_type_id ||
    !invoice.number ||
    !invoice.document_number
  ) {
    return res.status(400).json({ message: 'Los datos del comprobante son obligatorios.' });
  }

  // ✅ Verificar total calculado vs. total enviado
  const totalCalculado = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  if (parseFloat(totalCalculado.toFixed(2)) !== parseFloat(total.toFixed(2))) {
    return res.status(400).json({
      message: `El total enviado (S/.${total}) no coincide con el total calculado (S/.${totalCalculado.toFixed(2)}).`
    });
  }

  // ✅ Validar comprobante duplicado antes de continuar
  try {
    const [existingInvoice] = await db.query(
      'SELECT id FROM invoices WHERE invoice_number = ?',
      [invoice.number]
    );
    if (existingInvoice.length > 0) {
      return res.status(400).json({ message: 'El número de comprobante ya está registrado.' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Error al verificar el comprobante.', error: err.message });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // (Desde aquí sigue tu flujo tal como lo tenías)
    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, total, status_id) VALUES (?, ?, ?)',
      [user_id, total, 1]
    );
    const orderId = orderResult.insertId;

    await conn.query(
      'INSERT INTO order_status_history (order_id, status_id, changed_by) VALUES (?, ?, ?)',
      [orderId, 1, user_id]
    );

    await conn.query(
      'INSERT INTO order_addresses (order_id, recipient_name, phone, address, city, country) VALUES (?, ?, ?, ?, ?, ?)',
      [
        orderId,
        address.recipient_name,
        address.phone,
        address.address,
        address.city,
        address.country
      ]
    );

    for (let p of products) {
      await conn.query(
        'INSERT INTO order_details (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [orderId, p.id, p.quantity, p.price, p.quantity * p.price]
      );
    }

    for (let p of products) {
      const [[stockCheck]] = await conn.query('SELECT stock FROM products WHERE id = ?', [p.id]);
    
      if (!stockCheck || stockCheck.stock < p.quantity) {
        await conn.rollback();
        return res.status(400).json({
          message: `Stock insuficiente para el producto con ID ${p.id}`
        });
      }
    }
    
    for (let p of products) {
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [p.quantity, p.id]
      );
    }
    

    await conn.query(
      'INSERT INTO invoices (order_id, invoice_type_id, invoice_number, document_number, business_name) VALUES (?, ?, ?, ?, ?)',
      [
        orderId,
        invoice.invoice_type_id,
        invoice.number,
        invoice.document_number,
        invoice.business_name
      ]
    );

    const [[order]] = await conn.query(`
      SELECT o.id, o.total, o.created_at, u.name AS customer, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?`, [orderId]);

    const [productResults] = await conn.query(`
      SELECT p.name AS product_name, od.quantity, od.price, od.subtotal
      FROM order_details od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?`, [orderId]);

    const [[invoiceData]] = await conn.query(`
      SELECT i.*, t.name AS invoice_type_name
      FROM invoices i
      JOIN invoice_types t ON i.invoice_type_id = t.id
      WHERE i.order_id = ?`, [orderId]);

    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    doc.fontSize(20).text('Comprobante de Pago', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tipo: ${invoiceData.invoice_type_name}`);
    doc.text(`Número: ${invoiceData.invoice_number}`);
    doc.text(`Cliente: ${invoiceData.business_name || order.customer}`);
    doc.text(`Documento: ${invoiceData.document_number}`);
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.moveDown();

    doc.text('Productos:', { underline: true });
    productResults.forEach(p => {
      const price = parseFloat(p.price);
      const subtotal = parseFloat(p.subtotal);
      doc.text(`${p.quantity} x ${p.product_name} @ S/.${price.toFixed(2)} = S/.${subtotal.toFixed(2)}`);
    });

    const totalVal = parseFloat(order.total);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total: S/.${totalVal.toFixed(2)}`, { align: 'right' });

    if (invoiceData.invoice_type_name === 'factura') {
      const igv = (totalVal * 0.18).toFixed(2);
      const subtotal = (totalVal - igv).toFixed(2);
      doc.text(`Subtotal: S/.${subtotal}`, { align: 'right' });
      doc.text(`IGV (18%): S/.${igv}`, { align: 'right' });
    }

    doc.end();
    const pdfBuffer = await streamToBuffer(stream);

    await sendInvoiceEmail({
      to: order.email,
      subject: 'Tu comprobante de compra',
      html: `<p>Hola ${order.customer},</p><p>Gracias por tu compra. Adjuntamos tu comprobante.</p>`,
      pdfBuffer,
      filename: `comprobante-${order.id}.pdf`
    });

    await conn.commit();
    res.status(201).json({ message: 'Orden registrada y comprobante enviado' });

  } catch (err) {
    await conn.rollback();
    console.error('❌ Error al registrar orden:', err.message);
    res.status(500).json({ message: 'Error al registrar orden', error: err.message });
  } finally {
    conn.release();
  }
};

const getOrders = async (req, res, next) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM orders WHERE user_id = ?',
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrders
};
