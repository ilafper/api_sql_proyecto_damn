
drop table clientes;
create table clientes (
	id_cli SERIAL PRIMARY KEY,
	nombre varchar(30),
	apellidos varchar(30),
	telefono varchar(30),
	direccion varchar(30),
	correo varchar(30),
	code_user varchar(30)
);


select * from clientes;

INSERT INTO clientes (nombre, apellidos, telefono, direccion, correo, code_user)
VALUES
('Juan', 'Perez', '123456789', 'Calle Falsa 123', 'juan@mail.com', 'codigo12345'),
('Ana', 'Lopez', '987654321', 'Av. Siempre Viva 456', 'ana@mail.com', 'codigo12346'),
('Carlos', 'Gomez', '555123456', 'Calle Real 789', 'carlos@mail.com', 'codigo12347'),
('Laura', 'Martinez', '444987654', 'Av. Libertad 101', 'laura@mail.com', 'codigo12348'),
('Miguel', 'Sanchez', '333555666', 'Calle Sol 202', 'miguel@mail.com', 'codigo12349'),
('Sofia', 'Ramirez', '777888999', 'Av. Luna 303', 'sofia@mail.com', 'codigo12350'),
('Pedro', 'Torres', '222333444', 'Calle Estrella 404', 'pedro@mail.com', 'codigo12351'),
('Valentina', 'Diaz', '999000111', 'Av. Mar 505', 'valentina@mail.com', 'codigo12352'),
('Diego', 'Fernandez', '666777888', 'Calle Cielo 606', 'diego@mail.com', 'codigo12353'),
('Camila', 'Morales', '111222333', 'Av. Tierra 707', 'camila@mail.com', 'codigo12354');

-- Consultas de ejemplo:
-- Obtener todos los clientes
SELECT * FROM clientes ORDER BY id_cli ASC;

-- Buscar cliente por coincidencia de nombre (insensible a mayúsculas/minúsculas)
SELECT * FROM clientes WHERE nombre ILIKE '%ari%';

-- Eliminar un cliente por su código único
-- DELETE FROM clientes WHERE code_user = 'codigo12345';


