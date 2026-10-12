CREATE TABLE IF NOT EXISTS admin_costura_ordenes_espera (
    orden_id INT NOT NULL,
    motivo ENUM('No hay tela', 'Problema de calidad', 'Cambio de fecha') NOT NULL,
    fecha_espera TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (orden_id),
    CONSTRAINT fk_admin_costura_espera_orden
        FOREIGN KEY (orden_id)
        REFERENCES admin_costura_ordenes (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
