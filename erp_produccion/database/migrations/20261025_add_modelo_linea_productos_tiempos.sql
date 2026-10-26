ALTER TABLE productos_tiempos
    ADD COLUMN modelo VARCHAR(255) NULL AFTER cod_proceso,
    ADD COLUMN linea VARCHAR(255) NULL AFTER descripcion;
