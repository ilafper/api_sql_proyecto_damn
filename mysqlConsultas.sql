-- Seleccionar la base de datos de Laragon
USE damnsql;

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50),
  apellidos VARCHAR(50),
  telefono VARCHAR(30),
  direccion VARCHAR(100),
  correo VARCHAR(60),
  code_user VARCHAR(30) UNIQUE
);

-- Insertar datos de prueba
INSERT INTO clientes (nombre, apellidos, telefono, direccion, correo, code_user)
VALUES
('Juan', 'Perez', '123456789', 'Calle Falsa 123', 'juan@mail.com', 'codigo12345'),
('Ana', 'Lopez', '987654321', 'Av. Siempre Viva 456', 'ana@mail.com', 'codigo12346'),
('Carlos', 'Gomez', '555123456', 'Calle Real 789', 'carlos@mail.com', 'codigo12347');

-- Consultar todos los clientes
SELECT * FROM clientes ORDER BY id ASC;

-- ----------------------------------------------------
-- ESTRUCTURA PARA ESPACIOS / SITIOS Y RESERVAS
-- ----------------------------------------------------

-- 1. Tabla de Espacios / Sitios a alquilar
CREATE TABLE IF NOT EXISTS espacios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  ubicacion VARCHAR(150),
  capacidad_maxima INT NOT NULL,
  precio_por_dia DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'disponible',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Reservas
CREATE TABLE IF NOT EXISTS reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  espacio_id INT NOT NULL,
  usuario_id INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  numero_ocupantes INT NOT NULL,
  precio_total DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reserva_espacio FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON DELETE CASCADE,
  CONSTRAINT fk_reserva_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

