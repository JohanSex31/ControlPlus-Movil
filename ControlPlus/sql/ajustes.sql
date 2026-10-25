-- =============================================
-- AJUSTES — ejecutar UNA VEZ en Supabase (Editor SQL)
-- Hazlo ANTES de usar la nueva versión de la app.
-- =============================================

-- 1) Detalle de cada venta (productos vendidos)
CREATE TABLE IF NOT EXISTS "Detalle_Venta" (
  id_detalle SERIAL PRIMARY KEY,
  id_venta INTEGER NOT NULL REFERENCES "Venta"(id_venta) ON DELETE CASCADE,
  id_producto INTEGER REFERENCES "Producto"(id_producto) ON DELETE SET NULL,
  nombre_producto VARCHAR(150) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL
);

-- 2) Comentarios enviados desde el botón de cada pantalla
CREATE TABLE IF NOT EXISTS "Comentario" (
  id_comentario SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  pantalla VARCHAR(50),
  id_usuario INTEGER REFERENCES "Usuario"(id_usuario) ON DELETE SET NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Permite ventas a "Consumidor final" (sin cliente)
ALTER TABLE "Venta" ALTER COLUMN id_cliente DROP NOT NULL;

-- 4) Registrar venta: todo en una sola transacción.
--    Valida stock, descuenta stock, guarda el detalle y calcula el total
--    con los precios de la base de datos. La fecha usa hora de Colombia.
CREATE OR REPLACE FUNCTION registrar_venta(
  p_id_cliente integer,
  p_id_usuario integer,
  p_items jsonb
) RETURNS "Venta"
LANGUAGE plpgsql AS $$
DECLARE
  v_venta "Venta";
  v_item jsonb;
  v_prod "Producto";
  v_cant integer;
  v_total numeric := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta no tiene productos';
  END IF;

  INSERT INTO "Venta"(fecha, total, id_cliente, id_usuario)
  VALUES ((now() AT TIME ZONE 'America/Bogota')::date, 0, p_id_cliente, p_id_usuario)
  RETURNING * INTO v_venta;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cant := (v_item->>'cantidad')::int;
    IF v_cant IS NULL OR v_cant <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT * INTO v_prod FROM "Producto"
    WHERE id_producto = (v_item->>'id_producto')::int FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado';
    END IF;
    IF v_prod.stock < v_cant THEN
      RAISE EXCEPTION 'Stock insuficiente para "%": disponible %', v_prod.nombre, v_prod.stock;
    END IF;

    UPDATE "Producto" SET stock = stock - v_cant WHERE id_producto = v_prod.id_producto;
    INSERT INTO "Detalle_Venta"(id_venta, id_producto, nombre_producto, cantidad, precio_unitario)
    VALUES (v_venta.id_venta, v_prod.id_producto, v_prod.nombre, v_cant, v_prod.precio_venta);

    v_total := v_total + v_prod.precio_venta * v_cant;
  END LOOP;

  UPDATE "Venta" SET total = v_total WHERE id_venta = v_venta.id_venta RETURNING * INTO v_venta;
  RETURN v_venta;
END $$;

-- 5) Eliminar venta devolviendo el stock al inventario
--    (las ventas anteriores a este ajuste no tienen detalle, así que no devuelven stock)
CREATE OR REPLACE FUNCTION eliminar_venta(p_id_venta integer)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Producto" p SET stock = p.stock + d.cant
  FROM (
    SELECT id_producto, SUM(cantidad) AS cant
    FROM "Detalle_Venta" WHERE id_venta = p_id_venta AND id_producto IS NOT NULL
    GROUP BY id_producto
  ) d
  WHERE p.id_producto = d.id_producto;

  DELETE FROM "Venta" WHERE id_venta = p_id_venta;
END $$;

-- 6) OPCIONAL: nombres únicos (el código ya maneja el error de duplicado).
--    Ejecútalo solo si no tienes nombres repetidos.
-- ALTER TABLE "Producto"  ADD CONSTRAINT producto_nombre_unico  UNIQUE (nombre);
-- ALTER TABLE "Categoria" ADD CONSTRAINT categoria_nombre_unico UNIQUE (nombre);
