const mysql = require("mysql2/promise");

// Configuración de conexión a MySQL de Laragon
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",           // En Laragon por defecto el usuario root no tiene contraseña
  database: "damnsql",    // La base de datos que creaste en HeidiSQL
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;