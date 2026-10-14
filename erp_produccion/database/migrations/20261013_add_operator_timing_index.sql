ALTER TABLE operador_tiempos_costura
    ADD INDEX idx_operador_tiempos_operador_op_fin (id_operador, op, fecha_fin);
