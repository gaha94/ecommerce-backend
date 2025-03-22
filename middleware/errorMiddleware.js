const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log del error en la consola

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined // Mostrar solo en modo desarrollo
    });
};

module.exports = { errorHandler };
