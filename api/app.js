const express = require("express");
const cors = require("cors");
const pool = require("./db.js");
const multer = require("multer");
const app = express();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET || "clave_por_defecto_desarrollo";
app.use(cors());
app.use(express.json());


// Nombre y creación de la carpeta en donde estarán las imágenes
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuración de almacenamiento en disco para Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "espacio-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Hacer pública la carpeta para que Flutter pueda acceder a las fotos
app.use("/uploads", express.static(uploadDir));



// Crear tablas y migrar columnas automáticamente en Laragon
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

    // 2. Tabla de espacios / pistas
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

    // 3. Tabla de reservas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        espacio_id INT NOT NULL,
        usuario_id INT NOT NULL,
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        numero_ocupantes INT NOT NULL DEFAULT 1,
        precio_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(20) NOT NULL DEFAULT 'confirmada',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Migración automática: añade las columnas si tu tabla no las tenía
    const columnasAsegurar = [
      "ALTER TABLE reservas ADD COLUMN fecha DATE NULL",
      "ALTER TABLE reservas ADD COLUMN franja_horaria VARCHAR(50) NULL",
      "ALTER TABLE reservas ADD COLUMN evento_id INT NULL",
      "ALTER TABLE reservas ADD COLUMN espacio_id INT NULL",
      "ALTER TABLE espacios ADD COLUMN imagen_url VARCHAR(255) NULL",
      "ALTER TABLE espacios ADD COLUMN categoria VARCHAR(50) DEFAULT 'padel'"
    ];

    for (const sql of columnasAsegurar) {
      try {
        await pool.query(sql);
      } catch (_) {
        // La columna ya existía, no hace nada
      }
    }

    console.log("Tablas 'usuarios', 'espacios' y 'reservas' sincronizadas en MySQL");
  } catch (err) {
    console.error("Error conectando a MySQL en Laragon:", err.message);
  }
}
inicializarTabla();

// Ruta base
app.get("/", (req, res) => {
  res.json({ mensaje: "API funcionando correctamente 🚀" });
});

// Clientes
app.get(["/api/clientes", "/api/clientespostgress"], async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clientes ORDER BY id ASC");
    res.json({ success: true, lista_clientes: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REGISTRO
app.post("/api/auth/registro", async (req, res) => {
  const { email, password, password1, password2, nombre, nombre_completo, apellido, telefono, direccion, rol } = req.body;
  const pass1 = password1 || password;
  const pass2 = password2 || password;

  if (!email || !pass1) {
    return res.status(400).json({ success: false, mensaje: "El correo y la contraseña son obligatorios" });
  }
  if (pass1 !== pass2) {
    return res.status(400).json({ success: false, mensaje: "Las contraseñas no coinciden" });
  }

  try {
    const [existente] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente.length > 0) {
      return res.status(400).json({ success: false, mensaje: "Este correo electrónico ya está registrado" });
    }

    const nombreUsuario = nombre || nombre_completo || "";
    const rolUsuario = rol || "cliente";

    const sql = `
      INSERT INTO usuarios (email, password, nombre, apellido, telefono, direccion, rol)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [resultado] = await pool.query(sql, [email, pass1, nombreUsuario, apellido || "", telefono || "", direccion || "", rolUsuario]);

    res.status(201).json({
      success: true,
      mensaje: "Usuario registrado correctamente",
      usuario: { id: resultado.insertId, email: email, nombre: nombreUsuario, rol: rolUsuario }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, mensaje: "Email y contraseña son obligatorios" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email, password]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, mensaje: "Correo o contraseña incorrectos" });
    }

    const usuario = rows[0];
    const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, { expiresIn: "24h" });

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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ESPACIOS / PISTAS
// ==========================================

app.get("/api/espacios", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM espacios ORDER BY id DESC");
    res.json({ success: true, espacios: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/espacios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM espacios WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, mensaje: "Espacio no encontrado" });
    res.json({ success: true, espacio: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});







// Creacion de eventos / espacios (con imagen opcional)
app.post("/api/espacios", upload.single("imagen"), async (req, res) => {
  const { nombre, descripcion, ubicacion, capacidad_maxima, precio_por_dia, estado, categoria } = req.body;

  if (!nombre || !capacidad_maxima || precio_por_dia === undefined) {
    return res.status(400).json({ success: false, mensaje: "Nombre, capacidad máxima y precio por día son obligatorios" });
  }

  let imagen_url = null;
  if (req.file) {
    imagen_url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  const categoriaFinal = (categoria || "padel").toLowerCase().trim();

  try {
    const sql = `INSERT INTO espacios (nombre, descripcion, ubicacion, capacidad_maxima, precio_por_dia, categoria, imagen_url, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const [resultado] = await pool.query(sql, [
      nombre.trim(),
      descripcion || "",
      ubicacion || "",
      Number(capacidad_maxima),
      Number(precio_por_dia),
      categoriaFinal,
      imagen_url,
      estado || "disponible"
    ]);

    res.status(201).json({
      success: true,
      mensaje: "Espacio creado correctamente",
      espacio: {
        id: resultado.insertId,
        nombre,
        descripcion,
        ubicacion,
        capacidad_maxima,
        precio_por_dia,
        categoria: categoriaFinal,
        estado: estado || "disponible",
        imagen_url
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// RESERVAS (CONFIRMACIÓN DIRECTA & LISTA DE ESPERA)

app.post("/api/reservas", async (req, res) => {
  const espacioId = req.body.espacio_id || req.body.evento_id;
  const { usuario_id, fecha, franja_horaria } = req.body;

  if (!espacioId || !usuario_id || !fecha || !franja_horaria) {
    return res.status(400).json({
      success: false,
      mensaje: "espacio_id (o evento_id), usuario_id, fecha y franja_horaria son obligatorios"
    });
  }

  try {
    // 1. Comprobar si este mismo usuario ya tiene reserva activa
    const [duplicada] = await pool.query(
      `SELECT id, estado FROM reservas 
       WHERE (espacio_id = ? OR evento_id = ?) 
         AND (fecha = ? OR fecha_inicio = ?) 
         AND franja_horaria = ? 
         AND usuario_id = ? 
         AND estado != 'cancelada'`,
      [espacioId, espacioId, fecha, fecha, franja_horaria, usuario_id]
    );

    if (duplicada.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: duplicada[0].estado === 'confirmada'
          ? "Ya tienes una reserva confirmada para este horario"
          : "Ya estás registrado en la lista de espera de este horario"
      });
    }

    // 2. Comprobar si ya existe una reserva confirmada de otro socio
    const [ocupada] = await pool.query(
      `SELECT id FROM reservas 
       WHERE (espacio_id = ? OR evento_id = ?) 
         AND (fecha = ? OR fecha_inicio = ?) 
         AND franja_horaria = ? 
         AND estado = 'confirmada'`,
      [espacioId, espacioId, fecha, fecha, franja_horaria]
    );

    let estadoReserva = 'confirmada';
    let mensajeRespuesta = '¡Reserva confirmada al instante!';
    let turnoEspera = 0;

    if (ocupada.length > 0) {
      estadoReserva = 'en_espera';
      const [conteoEspera] = await pool.query(
        `SELECT COUNT(*) as total FROM reservas 
         WHERE (espacio_id = ? OR evento_id = ?) 
           AND (fecha = ? OR fecha_inicio = ?) 
           AND franja_horaria = ? 
           AND estado = 'en_espera'`,
        [espacioId, espacioId, fecha, fecha, franja_horaria]
      );
      turnoEspera = (conteoEspera[0]?.total || 0) + 1;
      mensajeRespuesta = `Horario ocupado. Te has inscrito en la Lista de Espera (Turno #${turnoEspera}).`;
    }

    // 3. Guardar completando todas las columnas para compatibilidad
    const [reservaResult] = await pool.query(
      `INSERT INTO reservas (espacio_id, evento_id, usuario_id, fecha, fecha_inicio, fecha_fin, franja_horaria, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [espacioId, espacioId, usuario_id, fecha, fecha, fecha, franja_horaria, estadoReserva]
    );

    return res.status(201).json({
      success: true,
      tipo: estadoReserva,
      mensaje: mensajeRespuesta,
      reserva: {
        id: reservaResult.insertId,
        espacio_id: espacioId,
        evento_id: espacioId,
        usuario_id,
        fecha,
        franja_horaria,
        estado: estadoReserva,
        turno_espera: turnoEspera
      }
    });

  } catch (error) {
    console.error("Error al procesar reserva:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/reservas", async (req, res) => {
  try {
    const { usuario_id, evento_id, espacio_id } = req.query;
    let sql = `
      SELECT r.*, 
             COALESCE(r.espacio_id, r.evento_id) AS espacio_id,
             COALESCE(r.evento_id, r.espacio_id) AS evento_id,
             COALESCE(r.fecha, r.fecha_inicio) AS fecha,
             u.email AS usuario_email, 
             u.nombre AS usuario_nombre,
             e.nombre AS espacio_nombre,
             e.ubicacion AS espacio_ubicacion
      FROM reservas r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN espacios e ON (e.id = r.espacio_id OR e.id = r.evento_id)
    `;
    const params = [];
    const condiciones = [];

    if (usuario_id) {
      condiciones.push("r.usuario_id = ?");
      params.push(usuario_id);
    }
    const idBusqueda = espacio_id || evento_id;
    if (idBusqueda) {
      condiciones.push("(r.espacio_id = ? OR r.evento_id = ?)");
      params.push(idBusqueda, idBusqueda);
    }

    if (condiciones.length > 0) {
      sql += " WHERE " + condiciones.join(" AND ");
    }
    sql += " ORDER BY r.id DESC";

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, reservas: rows });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancelar reserva y asignar automáticamente al siguiente en la Lista de Espera
app.patch(["/api/reservas/:id/cancelar", "/api/reservas/:id/estado"], async (req, res) => {
  const { id } = req.params;
  const nuevoEstado = (req.body.estado || 'cancelada').toLowerCase().trim();

  try {
    const [reservaRows] = await pool.query("SELECT * FROM reservas WHERE id = ?", [id]);
    if (reservaRows.length === 0) {
      return res.status(404).json({ success: false, mensaje: "Reserva no encontrada" });
    }

    const reservaActual = reservaRows[0];
    const eraConfirmada = reservaActual.estado === 'confirmada';
    const espId = reservaActual.espacio_id || reservaActual.evento_id;
    const fec = reservaActual.fecha || reservaActual.fecha_inicio;

    await pool.query("UPDATE reservas SET estado = ? WHERE id = ?", [nuevoEstado, id]);

    let socioPromovido = null;

    if (eraConfirmada && nuevoEstado === 'cancelada') {
      const [enEspera] = await pool.query(
        `SELECT r.*, u.email as usuario_email, u.nombre as usuario_nombre 
         FROM reservas r
         LEFT JOIN usuarios u ON r.usuario_id = u.id
         WHERE (r.espacio_id = ? OR r.evento_id = ?) 
           AND (r.fecha = ? OR r.fecha_inicio = ?) 
           AND r.franja_horaria = ? 
           AND r.estado = 'en_espera'
         ORDER BY r.id ASC LIMIT 1`,
        [espId, espId, fec, fec, reservaActual.franja_horaria]
      );

      if (enEspera.length > 0) {
        socioPromovido = enEspera[0];
        await pool.query("UPDATE reservas SET estado = 'confirmada' WHERE id = ?", [socioPromovido.id]);
        console.log(`Pista asignada automáticamente al socio en lista de espera ID ${socioPromovido.id}`);
      }
    }

    return res.json({
      success: true,
      mensaje: socioPromovido
        ? "Reserva cancelada. Pista asignada automáticamente al primer socio en lista de espera."
        : "Reserva cancelada correctamente.",
      reserva_id: id,
      socio_promovido: socioPromovido ? socioPromovido.id : null
    });
  } catch (error) {
    console.error("Error al cancelar reserva:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;