/**
 * Obtiene t_costura usando los primeros siete caracteres del código.
 * Ignora métricas vacías o en cero. Entre variantes válidas, prioriza el
 * código base de siete caracteres; después elige el código más corto y menor ID.
 */
export function tiempoCosturaPorPrefijoSql(aliasProducto: string): string {
    const prefijo = `LEFT(REPLACE(REPLACE(TRIM(${aliasProducto}.producto), '"', ''), CHAR(39), ''), 7)`
    return `(
        SELECT pt.t_costura
        FROM productos_tiempos pt
        WHERE pt.t_costura IS NOT NULL
          AND pt.t_costura > 0
          AND pt.costura IS NOT NULL
          AND TRIM(CAST(pt.costura AS CHAR)) <> ''
          AND UPPER(TRIM(CAST(pt.costura AS CHAR))) NOT IN ('N/A', 'NA', 'N/D')
          AND (
            pt.cod_proceso LIKE CONCAT(${prefijo}, '%')
            OR pt.cod_proceso LIKE CONCAT('"', ${prefijo}, '%')
            OR pt.cod_proceso LIKE CONCAT(CHAR(39), ${prefijo}, '%')
        )
        ORDER BY
            CASE WHEN CHAR_LENGTH(TRIM(pt.cod_proceso)) = 7 THEN 0 ELSE 1 END,
            CHAR_LENGTH(TRIM(pt.cod_proceso)) ASC,
            pt.id ASC
        LIMIT 1
    )`
}
