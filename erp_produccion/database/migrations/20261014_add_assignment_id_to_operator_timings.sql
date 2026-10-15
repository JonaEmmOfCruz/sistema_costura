ALTER TABLE operador_tiempos_costura
    ADD COLUMN id_asignacion BIGINT NULL AFTER id,
    ADD INDEX idx_operador_tiempos_asignacion_fin (id_asignacion, fecha_fin);
