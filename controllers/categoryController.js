const db = require('../config/db'); // Asegúrate que sea el pool exportado

const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT name FROM categories ORDER BY name');

    const categories = rows.map(row => row.name);
    res.json(categories);
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error.message);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

module.exports = { getCategories };
