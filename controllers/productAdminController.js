const db = require('../config/db');

// Crear un nuevo producto
const createProduct = (req, res) => {
    const { name, description, price, stock, category_id, image } = req.body;

    db.query('INSERT INTO products (name, description, price, stock, category_id, image) VALUES (?, ?, ?, ?, ?, ?)',
        [name, description, price, stock, category_id, image], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Producto creado correctamente" });
        }
    );
};

// Actualizar producto
const updateProduct = (req, res) => {
    const { product_id, name, description, price, stock, category_id, image } = req.body;

    db.query('UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image = ? WHERE id = ?',
        [name, description, price, stock, category_id, image, product_id], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Producto actualizado correctamente" });
        }
    );
};

// Eliminar producto
const deleteProduct = (req, res) => {
    const { product_id } = req.params;

    db.query('DELETE FROM products WHERE id = ?', [product_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Producto eliminado correctamente" });
    });
};

module.exports = { createProduct, updateProduct, deleteProduct };
