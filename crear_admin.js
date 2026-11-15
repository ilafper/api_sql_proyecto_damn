const pool = require("./api/db.js");

async function crearAdmin() {
  try {
    // 1. Asegurar que la tabla usuarios existe
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

    // 2. Datos del usuario administrador (soporta argumentos: node crear_admin.js <email> <password>)
    const email = process.argv[2] || "admin@admin.com";
    const password = process.argv[3] || "admin";
    const nombre = process.argv[4] || "Administrador";
    const apellido = process.argv[5] || "Principal";
    const telefono = "600000000";
    const direccion = "Oficina Central";
    const rol = "admin";

    // 3. Comprobar si ya existe
    const [existente] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);

    if (existente.length > 0) {
      // Actualizar a rol admin y asegurar contraseña
      await pool.query(
        "UPDATE usuarios SET password = ?, nombre = ?, apellido = ?, telefono = ?, direccion = ?, rol = ? WHERE email = ?",
        [password, nombre, apellido, telefono, direccion, rol, email]
      );
      console.log("==========================================");
      console.log(" Usuario admin ya existía y ha sido actualizado:");
      console.log(` ID: ${existente[0].id}`);
      console.log(` Email: ${email}`);
      console.log(` Password: ${password}`);
      console.log(` Rol: ${rol}`);
      console.log("==========================================");
    } else {
      // Insertar nuevo admin
      const [resultado] = await pool.query(
        "INSERT INTO usuarios (email, password, nombre, apellido, telefono, direccion, rol) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [email, password, nombre, apellido, telefono, direccion, rol]
      );
      console.log("==========================================");
      console.log(" ¡Usuario admin creado con éxito en MySQL!");
      console.log(` ID: ${resultado.insertId}`);
      console.log(` Email: ${email}`);
      console.log(` Password: ${password}`);
      console.log(` Rol: ${rol}`);
      console.log("==========================================");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error al conectar o crear el usuario admin:", error.message);
    process.exit(1);
  }
}

crearAdmin();
