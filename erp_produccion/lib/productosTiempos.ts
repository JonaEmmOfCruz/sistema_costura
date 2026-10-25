/**
 * Obtiene t_costura usando los primeros siete caracteres del código.
 * Si hay varias variantes, prioriza el código base de siete caracteres;
 * si no existe, elige la variante más corta y después el ID menor.
 */
export function tiempoCosturaPorPrefijoSql(aliasProducto: string): string {
    return `(
        SELECT pt.t_costura
        FROM productos_tiempos pt
        WHERE LEFT(TRIM(pt.cod_proceso), 7) = LEFT(TRIM(${aliasProducto}.producto), 7)
        ORDER BY
            CASE WHEN CHAR_LENGTH(TRIM(pt.cod_proceso)) = 7 THEN 0 ELSE 1 END,
            CHAR_LENGTH(TRIM(pt.cod_proceso)) ASC,
            pt.id ASC
        LIMIT 1
    )`
}
