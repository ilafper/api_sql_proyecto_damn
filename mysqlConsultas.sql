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
