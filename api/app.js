const express = require("express");
const cors = require("cors");
const pool = require("./db.js");

const app = express();
const jwt = require("jsonwebtoken");

const JWT_SECRET = "mi_clave_secreta_dam";

app.use(cors());
app.use(express.json());

// Crear la tabla si no existe automáticamente en la base de datos de Laragon
async function inicializarTabla() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(50),
        apellido VARCHAR(50),
        telefono VARCHAR(30),
        direccion VARCHAR(100),
        rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
      )
    `);

    console.log("Tabla 'clientes' verificada/creada en MySQL (damnsql)");
  } catch (err) {
    console.error("Error conectando a MySQL en Laragon:", err.message);
  }
}
inicializarTabla();

// Ruta base de comprobación
app.get("/", (req, res) => {
  res.json({ mensaje: "API de Agenda con MySQL (Laragon) funcionando correctamente 🚀" });
});

// Obtener todos los clientes
app.get(["/api/clientes", "/api/clientespostgress"], async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clientes ORDER BY id ASC");
    res.json({ success: true, lista_clientes: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear cliente
app.post(["/api/clientes", "/api/crearclientepostgress", "/api/crearclienteposgress"], async (req, res) => {
  const { nombre, apellidos, telefono, direccion, correo } = req.body;
  const code_user = 'codigo' + Math.floor(10000 + Math.random() * 90000);

  try {
    const sql = "INSERT INTO clientes (nombre, apellidos, telefono, direccion, correo, code_user) VALUES (?, ?, ?, ?, ?, ?)";
    const [result] = await pool.query(sql, [nombre, apellidos, telefono, direccion, correo, code_user]);

    const nuevoCliente = {
      id: result.insertId,
      nombre,
      apellidos,
      telefono,
      direccion,
      correo,
      code_user
    };

    console.log("Cliente creado:", nuevoCliente);

    res.status(201).json({
      success: true,
      mensaje: "Cliente creado correctamente",
      cliente: nuevoCliente
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// RUTA DE REGISTRO
app.post("/api/auth/registro", async (req, res) => {
  const { email, password, password1, password2, nombre, nombre_completo, apellido, telefono, direccion, rol } = req.body;

  // Soportar tanto password1/password2 como password
  const pass1 = password1 || password;
  const pass2 = password2 || password;

  // 1. Validar que vengan email y contraseña
  if (!email || !pass1) {
    return res.status(400).json({
      success: false,
      mensaje: "El correo y la contraseña son obligatorios"
    });
  }

  // 2. Comprobar en el backend si ambas contraseñas coinciden
  if (pass1 !== pass2) {
    return res.status(400).json({
      success: false,
      mensaje: "Las contraseñas no coinciden"
    });
  }

  try {
    // 3. Comprobar si el correo ya está registrado en la base de datos
    const [existente] = await pool.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: "Este correo electrónico ya está registrado"
      });
    }

    // 4. Insertar el nuevo usuario en MySQL (con las columnas reales de la tabla)
    const nombreUsuario = nombre || nombre_completo || "";
    const rolUsuario = rol || "cliente";

    const sql = `
      INSERT INTO usuarios (email, password, nombre, apellido, telefono, direccion, rol)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [resultado] = await pool.query(sql, [
      email,
      pass1,
      nombreUsuario,
      apellido || "",
      telefono || "",
      direccion || "",
      rolUsuario
    ]);

    // 5. Responder con éxito
    res.status(201).json({
      success: true,
      mensaje: "Usuario registrado correctamente",
      usuario: {
        id: resultado.insertId,
        email: email,
        nombre: nombreUsuario,
        rol: rolUsuario
      }
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// login

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // 1. Validar que vengan ambos campos
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      mensaje: "Email y contraseña son obligatorios"
    });
  }

  try {
    // 2. Buscar si el usuario existe con ese correo y contraseña exacta
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND password = ?",
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        mensaje: "Correo o contraseña incorrectos"
      });
    }

    const usuario = rows[0];

    // 3. GENERAR EL TOKEN JWT
    // Guardamos en el token los datos del usuario que Flutter pueda necesitar
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: "24h" } // El token durará 24 horas activo
    );

    // 4. Responder a Flutter con el token y sus datos (sin devolver la contraseña)
    res.json({
      success: true,
      mensaje: "Inicio de sesión correcto",
      token: token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo || usuario.nombre,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



module.exports = app;

