const db = require('../config/db');

// Obtener todos los productos con filtros
const getProducts = async (req, res) => {
    try {
      let query = "SELECT p.id, p.name, p.price, p.stock, c.name AS category FROM products p JOIN categories c ON p.category_id = c.id WHERE 1=1";
      const params = [];
  
      if (req.query.category) {
        query += ` AND c.name = ?`;
        params.push(req.query.category);
      }
      if (req.query.minPrice) {
        query += ` AND p.price >= ?`;
        params.push(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query += ` AND p.price <= ?`;
        params.push(req.query.maxPrice);
      }
      if (req.query.inStock === 'true') {
        query += ` AND p.stock > 0`;
      }
      if (req.query.search) {
        query += ` AND p.name LIKE ?`;
        params.push(`%${req.query.search}%`);
      }
      if (req.query.sort === 'asc') query += ` ORDER BY p.price ASC`;
      if (req.query.sort === 'desc') query += ` ORDER BY p.price DESC`;
  
      const [results] = await db.query(query, params);
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: 'Error al obtener productos', error: err.message });
    }
  };

// 🔥 Crear nuevo producto (para admin/editor)
const crearProducto = (req, res) => {
    const { name, price, stock, category_id } = req.body;

    if (!name || !price || !stock || !category_id) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const query = 'INSERT INTO products (name, price, stock, category_id) VALUES (?, ?, ?, ?)';
    db.query(query, [name, price, stock, category_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Producto creado exitosamente', product_id: result.insertId });
    });
};

module.exports = {
    getProducts,
    crearProducto // <-- ahora sí está exportado
};
