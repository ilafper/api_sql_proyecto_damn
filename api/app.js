const express = require("express");
const cors = require("cors");
const pool = require("./db.js");

const app = express();
const jwt = require("jsonwebtoken");

const JWT_SECRET = "mi_clave_secreta_dam";

app.use(cors());
app.use(express.json());

// Crear tablas si no existen automáticamente en la base de datos de Laragon
async function inicializarTabla() {
  try {
    // 1. Tabla de usuarios
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

    // 2. Tabla de espacios / sitios para alquilar
    await pool.query(`
      CREATE TABLE IF NOT EXISTS espacios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT,
        ubicacion VARCHAR(150),
        capacidad_maxima INT NOT NULL DEFAULT 10,
        precio_por_dia DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(20) NOT NULL DEFAULT 'disponible',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Tabla de reservas por fechas y ocupantes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        espacio_id INT NOT NULL,
        usuario_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        numero_ocupantes INT NOT NULL DEFAULT 1,
        precio_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(20) NOT NULL DEFAULT 'confirmada',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reserva_espacio FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON DELETE CASCADE,
        CONSTRAINT fk_reserva_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    console.log("Tablas 'usuarios', 'espacios' y 'reservas' verificadas en MySQL");
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


// ==========================================
// ESPACIOS / SITIOS PARA ALQUILAR
// ==========================================

// 1. Obtener todos los espacios
app.get("/api/espacios", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM espacios ORDER BY id DESC");
    res.json({ success: true, espacios: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Obtener un espacio específico por ID
app.get("/api/espacios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM espacios WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, mensaje: "Espacio no encontrado" });
    }
    res.json({ success: true, espacio: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Crear un nuevo espacio (Para Admin: no pone fechas ni horas, solo los datos del sitio)
app.post("/api/espacios", async (req, res) => {
  const {
    nombre,
    descripcion,
    ubicacion,
    capacidad_maxima,
    precio_por_dia,
    estado
  } = req.body;

  // Validaciones de datos reales requeridos
  if (!nombre || !capacidad_maxima || precio_por_dia === undefined) {
    return res.status(400).json({
      success: false,
      mensaje: "Nombre, capacidad máxima y precio por día son obligatorios"
    });
  }

  const capacidadNum = Number(capacidad_maxima);
  const precioNum = Number(precio_por_dia);

  if (isNaN(capacidadNum) || capacidadNum <= 0) {
    return res.status(400).json({
      success: false,
      mensaje: "La capacidad máxima debe ser un número entero mayor que 0"
    });
  }

  if (isNaN(precioNum) || precioNum < 0) {
    return res.status(400).json({
      success: false,
      mensaje: "El precio por día debe ser un número válido"
    });
  }

  try {
    const sql = `
      INSERT INTO espacios (nombre, descripcion, ubicacion, capacidad_maxima, precio_por_dia, estado)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [resultado] = await pool.query(sql, [
      nombre.trim(),
      descripcion ? descripcion.trim() : "",
      ubicacion ? ubicacion.trim() : "",
      capacidadNum,
      precioNum,
      estado ? estado.trim() : "disponible"
    ]);

    const nuevoEspacio = {
      id: resultado.insertId,
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : "",
      ubicacion: ubicacion ? ubicacion.trim() : "",
      capacidad_maxima: capacidadNum,
      precio_por_dia: precioNum,
      estado: estado ? estado.trim() : "disponible"
    };

    return res.status(201).json({
      success: true,
      mensaje: "Espacio creado correctamente",
      espacio: nuevoEspacio
    });
  } catch (error) {
    console.error("Error al crear espacio:", error);
    return res.status(500).json({
      success: false,
      mensaje: "Error interno al crear el espacio",
      error: error.message
    });
  }
});

// RESERVAS (Día/Mes/Año y Franja Horaria)

// Crear reserva verificando fecha y franja horaria
app.post("/api/reservas", async (req, res) => {
  const { evento_id, usuario_id, fecha, franja_horaria, estado } = req.body;

  // 1. Validaciones de campos obligatorios
  if (!evento_id || !usuario_id || !fecha || !franja_horaria) {
    return res.status(400).json({
      success: false,
      mensaje: "evento_id, usuario_id, fecha (YYYY-MM-DD) y franja_horaria son obligatorios"
    });
  }

  try {
    // 2. Comprobar si ya existe una reserva activa en esa misma fecha y franja horaria
    const [solapadas] = await pool.query(
      `SELECT id FROM reservas 
       WHERE evento_id = ? 
         AND fecha = ? 
         AND franja_horaria = ? 
         AND estado != 'cancelada'`,
      [evento_id, fecha, franja_horaria]
    );

    if (solapadas.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: "Esta franja horaria ya está reservada para esa fecha"
      });
    }

    // 3. Insertar la reserva
    const estadoReserva = 'pendiente';
    const sqlInsert = `
      INSERT INTO reservas (evento_id, usuario_id, fecha, franja_horaria, estado)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [reservaResult] = await pool.query(sqlInsert, [
      evento_id,
      usuario_id,
      fecha,
      franja_horaria,
      estadoReserva
    ]);

    const nuevaReserva = {
      id: reservaResult.insertId,
      evento_id,
      usuario_id,
      fecha,
      franja_horaria,
      estado: estadoReserva
    };

    console.log("Reserva creada con éxito:", nuevaReserva);

    return res.status(201).json({
      success: true,
      mensaje: "Reserva realizada con éxito",
      reserva: nuevaReserva
    });

  } catch (error) {
    console.error("Error al procesar reserva:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Listar todas las reservas (para admin o usuario)
app.get("/api/reservas", async (req, res) => {
  try {
    const { usuario_id, evento_id } = req.query;
    let sql = `
      SELECT r.*, u.email AS usuario_email, u.nombre AS usuario_nombre
      FROM reservas r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
    `;
    const params = [];
    const condiciones = [];

    if (usuario_id) {
      condiciones.push("r.usuario_id = ?");
      params.push(usuario_id);
    }
    if (evento_id) {
      condiciones.push("r.evento_id = ?");
      params.push(evento_id);
    }

    if (condiciones.length > 0) {
      sql += " WHERE " + condiciones.join(" AND ");
    }

    sql += " ORDER BY r.fecha DESC, r.franja_horaria ASC";

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, reservas: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// aceptar o rechazar reservas admin 

app.patch("/api/reservas/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body; // 'reservado' (o 'confirmada') / 'rechazado'
  if (!estado) {
    return res.status(400).json({
      success: false,
      mensaje: "El campo 'estado' es obligatorio ('reservado' o 'rechazado')"
    });
  }
  try {
    const [result] = await pool.query(
      "UPDATE reservas SET estado = ? WHERE id = ?",
      [estado.toLowerCase().trim(), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        mensaje: "Reserva no encontrada"
      });
    }
    return res.json({
      success: true,
      mensaje: `Reserva marcada como ${estado}`,
      reserva_id: id,
      nuevo_estado: estado
    });
  } catch (error) {
    console.error("Error al actualizar estado de la reserva:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

