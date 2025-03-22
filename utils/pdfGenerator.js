const PDFDocument = require('pdfkit');

const generateInvoicePDF = (res, order, products, invoice) => {
    const doc = new PDFDocument({ margin: 50 });

    // Set headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${order.id}.pdf`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('Comprobante de Pago', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tipo: ${invoice.invoice_type === 'factura' ? 'Factura' : 'Boleta'}`);
    doc.text(`Número: ${invoice.invoice_number}`);
    doc.text(`Cliente: ${invoice.business_name || order.customer}`);
    doc.text(`Documento: ${invoice.document_number}`);
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.moveDown();

    // Tabla de productos
    doc.text('Productos:', { underline: true });
    products.forEach(p => {
        const price = parseFloat(p.price);
        const subtotal = parseFloat(p.subtotal);
    
        doc.text(`${p.quantity} x ${p.product_name} @ S/.${price.toFixed(2)} = S/.${subtotal.toFixed(2)}`);
    });    

    doc.moveDown();
    const total = parseFloat(order.total);
    doc.font('Helvetica-Bold').text(`Total: S/.${total.toFixed(2)}`, { align: 'right' });


    if (invoice.invoice_type === 'factura') {
        const igv = (total * 0.18).toFixed(2);
        const subtotal = (total - igv).toFixed(2);
        doc.text(`Subtotal: S/.${subtotal}`, { align: 'right' });
        doc.text(`IGV (18%): S/.${igv}`, { align: 'right' });
    }    

    doc.end();
};

module.exports = generateInvoicePDF;
