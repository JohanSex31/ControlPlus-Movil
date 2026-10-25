
## 🗄️ Tablas requeridas en Supabase

Crea estas tablas en tu proyecto de Supabase (Editor SQL):

```sql
-- Tabla Usuario
CREATE TABLE "Usuario" (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  contrasena VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'Cajero'
);

-- Tabla Categoria
CREATE TABLE "Categoria" (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

-- Tabla Producto
CREATE TABLE "Producto" (
  id_producto SERIAL PRIMARY KEY,
  nombre VARCHAR(150) UNIQUE NOT NULL,
  descripcion TEXT,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  id_categoria INTEGER REFERENCES "Categoria"(id_categoria)
);

-- Tabla Cliente
CREATE TABLE "Cliente" (
  id_cliente SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(150),
  direccion TEXT,
  fecha_registro DATE DEFAULT CURRENT_DATE
);

-- Tabla Proveedor
CREATE TABLE "Proveedor" (
  id_proveedor SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  nit VARCHAR(30) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  correo VARCHAR(150) NOT NULL
);

-- Tabla Venta
CREATE TABLE "Venta" (
  id_venta SERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  id_cliente INTEGER REFERENCES "Cliente"(id_cliente),
  id_usuario INTEGER REFERENCES "Usuario"(id_usuario)
);

-- Usuario administrador por defecto
INSERT INTO "Usuario" (nombre, username, contrasena, rol)
VALUES ('Administrador', 'admin', 'admin123', 'Administrador');
```
Funcionalidades

- 🔐 Login con roles (Administrador / Cajero)
- 📦 CRUD de productos con control de stock y categorías
- 🛒 Nueva venta con búsqueda autocomplete y carrito dinámico
- 💰 Cálculo automático de cambio y validación de pago
- 🧾 Factura imprimible por venta
- 🔔 Alertas automáticas de stock bajo al iniciar sesión
- 📊 Dashboard con KPIs en tiempo real
- 🧾 Reporte de facturación con filtros por fecha
- 📱 Responsive (funciona en celular, tablet y computador)

## 🔧 Ajustes adicionales (ejecutar después de crear las tablas)

Ejecuta `sql/ajustes.sql` en el Editor SQL de Supabase. Crea `Detalle_Venta` y `Comentario`, y las funciones `registrar_venta` y `eliminar_venta`.
