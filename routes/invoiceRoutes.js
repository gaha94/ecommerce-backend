const express = require('express');
const db = require('../config/db');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const generateInvoicePDF = require('../utils/pdfGenerator');
const sendInvoiceEmail = require('../utils/emailService');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

const router = express.Router();

// 🔧 Función auxiliar para convertir stream en buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

//
// 🧾 Ruta: Generar PDF en navegador
//
router.get('/:orderId/pdf', protect, adminOnly, (req, res) => {
  const orderId = req.params.orderId;

  const orderQuery = `
    SELECT o.id, o.total, o.created_at, u.name AS customer
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;
  const productQuery = `
    SELECT p.name AS product_name, od.quantity, od.price, od.subtotal
    FROM order_details od
    JOIN products p ON od.product_id = p.id
    WHERE od.order_id = ?
  `;
  const invoiceQuery = `SELECT * FROM invoices WHERE order_id = ?`;

  db.query(orderQuery, [orderId], (err, orderResults) => {
    if (err || orderResults.length === 0)
      return res.status(404).json({ message: 'Orden no encontrada' });

    const order = orderResults[0];

    db.query(productQuery, [orderId], (err, productResults) => {
      if (err) return res.status(500).json({ message: 'Error al obtener productos' });

      db.query(invoiceQuery, [orderId], (err, invoiceResults) => {
        if (err || invoiceResults.length === 0)
          return res.status(404).json({ message: 'Comprobante no encontrado' });

        const invoice = invoiceResults[0];
        generateInvoicePDF(res, order, productResults, invoice);
      });
    });
  });
});

//
// 📧 Ruta: Enviar comprobante PDF por correo
//
router.post('/:orderId/send', protect, adminOnly, async (req, res) => {
  const orderId = req.params.orderId;

  const orderQuery = `
    SELECT o.id, o.total, o.created_at, u.name AS customer, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `;
  const productQuery = `
    SELECT p.name AS product_name, od.quantity, od.price, od.subtotal
    FROM order_details od
    JOIN products p ON od.product_id = p.id
    WHERE od.order_id = ?
  `;
  const invoiceQuery = `SELECT * FROM invoices WHERE order_id = ?`;

  db.query(orderQuery, [orderId], (err, orderResults) => {
    if (err || orderResults.length === 0)
      return res.status(404).json({ message: 'Orden no encontrada' });

    const order = orderResults[0];

    db.query(productQuery, [orderId], (err, products) => {
      if (err) return res.status(500).json({ message: 'Error al obtener productos' });

      db.query(invoiceQuery, [orderId], async (err, invoiceResults) => {
        if (err || invoiceResults.length === 0)
          return res.status(404).json({ message: 'Comprobante no encontrado' });

        const invoice = invoiceResults[0];

        // 🧾 Generar PDF en memoria
        const doc = new PDFDocument({ margin: 50 });
        const stream = new PassThrough();
        doc.pipe(stream);

        // 📝 Contenido del PDF
        doc.fontSize(20).text('Comprobante de Pago', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Tipo: ${invoice.invoice_type}`);
        doc.text(`Número: ${invoice.invoice_number}`);
        doc.text(`Cliente: ${invoice.business_name || order.customer}`);
        doc.text(`Documento: ${invoice.document_number}`);
        doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`);
        doc.moveDown();

        doc.text('Productos:', { underline: true });
        products.forEach(p => {
          const price = parseFloat(p.price);
          const subtotal = parseFloat(p.subtotal);
          doc.text(`${p.quantity} x ${p.product_name} @ S/.${price.toFixed(2)} = S/.${subtotal.toFixed(2)}`);
        });

        const total = parseFloat(order.total);
        doc.moveDown();
        doc.font('Helvetica-Bold').text(`Total: S/.${total.toFixed(2)}`, { align: 'right' });

        if (invoice.invoice_type === 'factura') {
          const igv = (total * 0.18).toFixed(2);
          const subtotal = (total - igv).toFixed(2);
          doc.text(`Subtotal: S/.${subtotal}`, { align: 'right' });
          doc.text(`IGV (18%): S/.${igv}`, { align: 'right' });
        }

        doc.end();

        // 📦 Convertir a buffer
        const pdfBuffer = await streamToBuffer(stream);

        // ✉️ Enviar correo
        await sendInvoiceEmail({
          to: order.email,
          subject: 'Tu comprobante de compra',
          html: `<p>Hola ${order.customer},</p><p>Gracias por tu compra. Adjuntamos tu comprobante.</p>`,
          pdfBuffer,
          filename: `comprobante-${order.id}.pdf`
        });

        res.json({ message: 'Correo enviado exitosamente' });
      });
    });
  });
});

module.exports = router;
