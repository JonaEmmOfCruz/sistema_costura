ALTER TABLE productos_tiempos
    ADD COLUMN id_proceso INT NULL AFTER id,
    CHANGE COLUMN codigo cod_proceso VARCHAR(255) NULL,
    CHANGE COLUMN nombre_secundario descripcion TEXT,
    ADD COLUMN t_costura DECIMAL(12, 2) NULL AFTER costura,
    ADD COLUMN tapizado VARCHAR(255) NULL AFTER t_costura,
    ADD COLUMN t_tapizado DECIMAL(12, 2) NULL AFTER tapizado,
    ADD COLUMN armado VARCHAR(255) NULL AFTER t_tapizado,
    ADD COLUMN t_armado DECIMAL(12, 2) NULL AFTER armado,
    ADD COLUMN montado VARCHAR(255) NULL AFTER t_armado,
    ADD COLUMN t_montado DECIMAL(12, 2) NULL AFTER montado,
    ADD COLUMN empaque VARCHAR(255) NULL AFTER t_montado,
    ADD COLUMN t_empaque DECIMAL(12, 2) NULL AFTER empaque,
    ADD COLUMN corte VARCHAR(255) NULL AFTER t_empaque,
    ADD COLUMN t_corte DECIMAL(12, 2) NULL AFTER corte;

UPDATE productos_tiempos
SET t_costura = CASE
    WHEN TRIM(tiempo) REGEXP '^[0-9]+([.][0-9]+)?$' THEN CAST(tiempo AS DECIMAL(12, 2))
    ELSE NULL
END;

ALTER TABLE productos_tiempos
    DROP COLUMN modelo,
    DROP COLUMN nombre,
    DROP COLUMN tiempo,
    ADD UNIQUE KEY uq_productos_tiempos_cod_proceso (cod_proceso);
