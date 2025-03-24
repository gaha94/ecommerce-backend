const db = require('../config/db');

// Obtener todos los productos con filtros
const getProducts = async (req, res) => {
  try {
    let query = `
      SELECT p.id, p.name, p.price, p.stock, c.name AS category
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // Filtros
    if (req.query.category) {
      query += ' AND c.name = ?';
      params.push(req.query.category);
    }

    if (req.query.minPrice) {
      query += ' AND p.price >= ?';
      params.push(req.query.minPrice);
    }

    if (req.query.maxPrice) {
      query += ' AND p.price <= ?';
      params.push(req.query.maxPrice);
    }

    if (req.query.inStock === 'true') {
      query += ' AND p.stock > 0';
    }

    if (req.query.search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${req.query.search}%`);
    }

    // Orden
    if (req.query.sort === 'asc') {
      query += ' ORDER BY p.price ASC';
    } else if (req.query.sort === 'desc') {
      query += ' ORDER BY p.price DESC';
    }

    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Ejecutar consulta
    const [products] = await db.query(query, params);

    // Obtener total de resultados (para frontend)
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) as total
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
      ${req.query.category ? ' AND c.name = ?' : ''}
      ${req.query.minPrice ? ' AND p.price >= ?' : ''}
      ${req.query.maxPrice ? ' AND p.price <= ?' : ''}
      ${req.query.inStock === 'true' ? ' AND p.stock > 0' : ''}
      ${req.query.search ? ' AND p.name LIKE ?' : ''}
    `, params.slice(0, params.length - 2)); // solo los filtros

    res.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
    res.status(500).json({ message: 'Error al obtener productos' });
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

const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await db.getConnection();
    const [[product]] = await conn.query(
      `SELECT p.id, p.name, p.price, p.stock, p.description, c.name AS category
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`, [id]
    );
    conn.release();

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('❌ Error al obtener producto por ID:', error.message);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
};

module.exports = {
    getProducts,
    crearProducto, // <-- ahora sí está exportado
    getProductById,
};
