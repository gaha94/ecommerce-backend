const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendInvoiceEmail = async ({ to, subject, html, pdfBuffer, filename }) => {
    try {
        await transporter.sendMail({
            from: `"Mi E-commerce" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments: [
                {
                    filename,
                    content: pdfBuffer
                }
            ]
        });
        console.log('📧 Correo enviado a', to);
    } catch (err) {
        console.error('❌ Error al enviar correo:', err.message);
    }
};

module.exports = sendInvoiceEmail;
