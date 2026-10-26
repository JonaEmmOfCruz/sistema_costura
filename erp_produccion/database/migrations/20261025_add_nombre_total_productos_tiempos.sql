ALTER TABLE productos_tiempos
    ADD COLUMN nombre VARCHAR(255) NULL AFTER modelo,
    MODIFY COLUMN linea VARCHAR(255) NULL AFTER nombre,
    ADD COLUMN tiempo_total_costura DECIMAL(12, 2) NULL AFTER t_costura;
