import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { pageMetadata, pageRows, readPageParams } from '@/lib/pagination'

// GET: Obtener todas las peticiones pendientes registradas
export const dynamic = 'force-dynamic';

const CODIGO_LIMPIO_SQL = `REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), '')`
const PREFIJO_FAMILIA = `LEFT(${CODIGO_LIMPIO_SQL}, 7)`

const COINCIDE_FAMILIA = (aliasTiempo: string) => `(
    ${aliasTiempo}.cod_proceso LIKE CONCAT(${PREFIJO_FAMILIA}, '%')
    OR ${aliasTiempo}.cod_proceso LIKE CONCAT('"', ${PREFIJO_FAMILIA}, '%')
    OR ${aliasTiempo}.cod_proceso LIKE CONCAT(CHAR(39), ${PREFIJO_FAMILIA}, '%')
)`

async function resolverPeticionesConTiempoFamiliar() {
    const [pendientes]: any = await pool.query(
        `SELECT id FROM peticiones_tiempos WHERE LOWER(estatus) = 'pendiente' LIMIT 1`
    )
    if (!pendientes.length) return

    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        await connection.query(
            `INSERT INTO productos_tiempos
                (cod_proceso, descripcion, costura, t_costura, fecha_actualizacion)
             SELECT ${CODIGO_LIMPIO_SQL}, p.nombre_secundario, familia.costura, familia.t_costura, NOW()
             FROM peticiones_tiempos p
             JOIN productos_tiempos familia ON familia.id = (
                 SELECT candidata.id
                 FROM productos_tiempos candidata
                 WHERE candidata.t_costura > 0
                   AND candidata.costura IS NOT NULL
                   AND TRIM(CAST(candidata.costura AS CHAR)) <> ''
                   AND (
                       candidata.cod_proceso LIKE CONCAT(${PREFIJO_FAMILIA}, '%')
                       OR candidata.cod_proceso LIKE CONCAT('"', ${PREFIJO_FAMILIA}, '%')
                       OR candidata.cod_proceso LIKE CONCAT(CHAR(39), ${PREFIJO_FAMILIA}, '%')
                   )
                 ORDER BY
                   CASE WHEN CHAR_LENGTH(TRIM(candidata.cod_proceso)) = 7 THEN 0 ELSE 1 END,
                   CHAR_LENGTH(TRIM(candidata.cod_proceso)) ASC,
                   candidata.id ASC
                 LIMIT 1
             )
             WHERE LOWER(p.estatus) = 'pendiente'
             ON DUPLICATE KEY UPDATE
                descripcion = IF(VALUES(descripcion) <> '', VALUES(descripcion), productos_tiempos.descripcion),
                costura = VALUES(costura),
                t_costura = VALUES(t_costura),
                fecha_actualizacion = NOW()`
        )
        await connection.query(
            `UPDATE peticiones_tiempos p
             SET p.estatus = 'atendido'
             WHERE LOWER(p.estatus) = 'pendiente'
               AND EXISTS (
                   SELECT 1 FROM productos_tiempos familia
                   WHERE familia.t_costura > 0
                     AND familia.costura IS NOT NULL
                     AND TRIM(CAST(familia.costura AS CHAR)) <> ''
                     AND ${COINCIDE_FAMILIA('familia')}
               )`
        )
        await connection.commit()
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}

export async function GET(request: Request) {
    try {
        // Resuelve solicitudes antiguas si desde su creación apareció un tiempo válido en la familia.
        await resolverPeticionesConTiempoFamiliar()
        const { page, pageSize, offset } = readPageParams(request)
        const incluirHistorial = new URL(request.url).searchParams.get('history') === '1'
        const tiempoAsignadoSelect = incluirHistorial ? `(
            SELECT pt.t_costura
            FROM productos_tiempos pt
            WHERE pt.t_costura > 0
              AND (
                  pt.cod_proceso = REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), '')
                  OR pt.cod_proceso LIKE CONCAT(LEFT(REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), ''), 7), '%')
                  OR pt.cod_proceso LIKE CONCAT('"', LEFT(REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), ''), 7), '%')
                  OR pt.cod_proceso LIKE CONCAT(CHAR(39), LEFT(REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), ''), 7), '%')
              )
            ORDER BY
              CASE WHEN pt.cod_proceso = REPLACE(REPLACE(TRIM(p.codigo), '"', ''), CHAR(39), '') THEN 0 ELSE 1 END,
              CHAR_LENGTH(TRIM(pt.cod_proceso)) ASC,
              pt.id ASC
            LIMIT 1
        ) AS tiempo_asignado` : 'NULL AS tiempo_asignado'
        const [peticiones]: any = await pool.query(
            `SELECT p.id, p.op, p.modelo, p.codigo, p.nombre_secundario, p.estatus, p.fecha_solicitud,
                    ${tiempoAsignadoSelect}
             FROM peticiones_tiempos p
             ${incluirHistorial ? '' : "WHERE LOWER(p.estatus) = 'pendiente'"}
             ORDER BY p.id DESC
             LIMIT ? OFFSET ?`,
            [pageSize + 1, offset]
        )

        return NextResponse.json({ 
            success: true, 
            peticiones: Array.isArray(peticiones) ? pageRows(peticiones, pageSize) : [],
            pagination: pageMetadata(page, pageSize, peticiones.length)
        })
    } catch (error) {
        console.error('Error al consultar peticiones pendientes:', error)
        return NextResponse.json({ 
            success: false, 
            message: 'Error interno al consultar peticiones', 
            peticiones: [] 
        }, { status: 500 })
    }
}

// POST: Registrar una nueva petición
export async function POST(request: Request) {
    let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null
    try {
        const body = await request.json()
        const op = String(body.op || '').trim()
        const codigo = String(body.codigo || '').trim().replace(/^["']|["']$/g, '').trim()
        const nombre_secundario = String(body.nombre_secundario || '').trim()
        const modelo = codigo.slice(0, 7)

        if (!codigo) {
            return NextResponse.json({ success: false, message: 'Falta el código del producto.' }, { status: 400 })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()

        const [familias]: any = await connection.query(
            `SELECT costura, t_costura
             FROM productos_tiempos
             WHERE t_costura > 0
               AND costura IS NOT NULL
               AND TRIM(CAST(costura AS CHAR)) <> ''
               AND (
                   cod_proceso LIKE CONCAT(?, '%')
                   OR cod_proceso LIKE CONCAT('"', ?, '%')
                   OR cod_proceso LIKE CONCAT(CHAR(39), ?, '%')
               )
             ORDER BY
               CASE WHEN CHAR_LENGTH(TRIM(cod_proceso)) = 7 THEN 0 ELSE 1 END,
               CHAR_LENGTH(TRIM(cod_proceso)) ASC,
               id ASC
             LIMIT 1
             FOR UPDATE`,
            [modelo, modelo, modelo]
        )

        if (familias.length) {
            const familia = familias[0]
            await connection.query(
                `INSERT INTO productos_tiempos
                    (cod_proceso, descripcion, costura, t_costura, fecha_actualizacion)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                    descripcion = IF(VALUES(descripcion) <> '', VALUES(descripcion), productos_tiempos.descripcion),
                    costura = VALUES(costura),
                    t_costura = VALUES(t_costura),
                    fecha_actualizacion = NOW()`,
                [codigo, nombre_secundario, familia.costura, familia.t_costura]
            )
            const [solicitudesPrevias]: any = await connection.query(
                `SELECT id FROM peticiones_tiempos
                 WHERE codigo = ?
                 ORDER BY id DESC
                 LIMIT 1 FOR UPDATE`,
                [codigo]
            )
            if (solicitudesPrevias.length) {
                await connection.query(
                    `UPDATE peticiones_tiempos
                     SET op = ?, modelo = ?, nombre_secundario = ?, estatus = 'atendido'
                     WHERE id = ?`,
                    [op, modelo, nombre_secundario, solicitudesPrevias[0].id]
                )
            } else {
                await connection.query(
                    `INSERT INTO peticiones_tiempos (op, modelo, codigo, nombre_secundario, estatus)
                     VALUES (?, ?, ?, ?, 'atendido')`,
                    [op, modelo, codigo, nombre_secundario]
                )
            }
            await connection.query(
                `UPDATE peticiones_tiempos SET estatus = 'atendido'
                 WHERE codigo = ? AND LOWER(estatus) = 'pendiente'`,
                [codigo]
            )
            await connection.commit()
            return NextResponse.json({
                success: true,
                asignadoAutomaticamente: true,
                tiempo: familia.t_costura,
                familia: modelo,
                message: `Tiempo asignado automáticamente desde la familia ${modelo}.`,
            })
        }

        const [existentes]: any = await connection.query(
            `SELECT id FROM peticiones_tiempos
             WHERE codigo = ? AND LOWER(estatus) = 'pendiente'
             LIMIT 1 FOR UPDATE`,
            [codigo]
        )
        if (existentes.length) {
            await connection.commit()
            return NextResponse.json({ success: true, message: 'La solicitud ya está pendiente de revisión.' })
        }

        await connection.query(
            `INSERT INTO peticiones_tiempos (op, modelo, codigo, nombre_secundario, estatus)
             VALUES (?, ?, ?, ?, 'pendiente')`,
            [op, modelo, codigo, nombre_secundario]
        )
        await connection.commit()
        return NextResponse.json({ success: true, pendiente: true, message: 'No hay tiempo válido para esta familia. La solicitud quedó pendiente de revisión.' })
    } catch (error) {
        if (connection) await connection.rollback()
        console.error('Error al guardar la petición:', error)
        return NextResponse.json({ success: false, message: 'Error al guardar la petición' }, { status: 500 })
    } finally {
        connection?.release()
    }
}
