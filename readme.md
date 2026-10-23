# API PostgreSQL - Agenda con Node.js y Express

API REST para la gestión de clientes/contactos conectada a PostgreSQL.

---

## 📁 Estructura del Proyecto

```text
api_postgress_agenda/
├── api/
│   ├── app.js             # Configuración de Express, middlewares (CORS) y endpoints
│   ├── db.js              # Conexión al pool de PostgreSQL (pg)
│   └── index.js           # Inicio del servidor HTTP (puerto 5500)
├── index.js               # Punto de entrada raíz (redirige a ./api/index.js)
├── postgresConsultas.sql  # Script SQL con creación de tabla y consultas de prueba
├── postgresEnpoint/       # Colección de peticiones HTTP para Bruno
├── package.json           # Dependencias y scripts de npm
└── readme.md              # Documentación
```

---

## ⚙️ 1. Requisitos Previos

1. **PostgreSQL** instalado y corriendo (por defecto en el puerto `5432`).
2. Base de datos creada (en `api/db.js` está configurada como `database: "postgres"`, usuario `postgres`).
3. Ejecutar el script SQL [postgresConsultas.sql](file:///c:/Users/cuent/Documents/src/api_postgress_agenda/postgresConsultas.sql) en pgAdmin o psql para crear la tabla `clientes`.

---

## 🚀 2. Instalación y Ejecución

Instala las dependencias necesarias (`express`, `pg`, `cors`):

```bash
npm install
```

Para iniciar el servidor:

```bash
# Modo normal
npm start

# Modo desarrollo (se reinicia automáticamente con cambios)
npm run dev

# O directamente con node
node index.js
```

El servidor quedará escuchando en:  
👉 **`http://localhost:5500`**

---

## 📡 3. Endpoints de la API

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/` | Comprobación de estado del servidor |
| `GET` | `/api/clientes` (o `/api/clientespostgress`) | Obtiene la lista de todos los clientes |
| `POST` | `/api/clientes` (o `/api/crearclientepostgress`) | Registra un nuevo cliente |
| `DELETE` | `/api/clientes/:code_user` (o `/api/deleteclipostgress/:code_user`) | Elimina un cliente por su código único |

### Ejemplo Body para `POST /api/clientes`:
```json
{
  "nombre": "Ana",
  "apellidos": "Garcia Lopez",
  "telefono": "612345678",
  "direccion": "Calle Mayor 12",
  "correo": "ana.garcia@example.com"
}
```
