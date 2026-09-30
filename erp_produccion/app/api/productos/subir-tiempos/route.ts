import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ success: false, message: 'No se ha proporcionado ningún archivo' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        
        // Leer el archivo Excel usando xlsx
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Convertir la hoja a JSON
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        if (rows.length === 0) {
            return NextResponse.json({ success: false, message: 'El archivo Excel está vacío' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // Opcional: Limpiar la tabla antes de insertar nuevos datos o usar inserción masiva
            for (const row of rows) {
                const modelo = row['MODELO'] || row['modelo'] || ''
                const nombre = row['NOMBRE'] || row['nombre'] || ''
                const codigo = row['CODIGO'] || row['codigo'] || ''
                const nombreSecundario = row['Nombre'] || row['nombre_secundario'] || ''
                const costura = row['COSTURA'] || row['costura'] || ''
                const tiempo = row['TIEMPO'] || row['tiempo'] || ''

                if (codigo) {
                    await connection.query(
                        `INSERT INTO productos_tiempos 
                        (modelo, nombre, codigo, nombre_secundario, costura, tiempo) 
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        modelo = VALUES(modelo), 
                        nombre = VALUES(nombre), 
                        nombre_secundario = VALUES(nombre_secundario), 
                        costura = VALUES(costura), 
                        tiempo = VALUES(tiempo)`,
                        [modelo, nombre, codigo, nombreSecundario, costura, String(tiempo)]
                    )
                }
            }

            await connection.commit()
            connection.release()

            return NextResponse.json({ 
                success: true, 
                message: `Archivo procesado con éxito. Se registraron ${rows.length} filas.` 
            })

        } catch (dbError) {
            await connection.rollback()
            connection.release()
            throw dbError
        }

    } catch (error) {
        console.error('Error al procesar el archivo Excel:', error)
        return NextResponse.json({ success: false, message: 'Error interno al procesar el archivo' }, { status: 500 })
    }
}