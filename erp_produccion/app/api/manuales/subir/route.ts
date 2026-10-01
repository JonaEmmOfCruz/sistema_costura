import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Limpia el nombre del archivo subido para obtener la clave primaria
function extraerCodigoUnico(nombreArchivo: string): string {
    const nombreSinExt = path.basename(nombreArchivo, path.extname(nombreArchivo))
    // Si el nombre viene como "102-1361N-00-23", toma el segundo elemento
    // Si viene directo como "1361N" o "1361N-v1", toma la clave relevante
    const partes = nombreSinExt.split('-')
    return partes.length > 1 && partes[0].length <= 3 ? partes[1].trim() : partes[0].trim()
}

export async function POST(request: Request) {
    try {
        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ success: false, message: 'No se ha proporcionado ningún archivo.' }, { status: 400 })
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ 
                success: false, 
                message: 'Formato no válido. Solo se permiten archivos PNG, JPG o PDF.' 
            }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Extraer la clave del archivo subido (ejemplo: "1361N")
        const codigoRelacion = extraerCodigoUnico(file.name)

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.name)
        const filename = `${path.basename(file.name, ext)}-${uniqueSuffix}${ext}`
        
        const uploadDir = path.join(process.cwd(), 'public/uploads')
        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)

        const rutaPublica = `/uploads/${filename}`

        await pool.query(
            `INSERT INTO manuales_produccion (nombre_original, codigo_relacion, nombre_archivo, ruta, tamanio, tipo) VALUES (?, ?, ?, ?, ?, ?)`,
            [file.name, codigoRelacion, filename, rutaPublica, file.size, file.type]
        )

        return NextResponse.json({ 
            success: true, 
            message: `Manual subido. Registrado con el código de relación: "${codigoRelacion}"` 
        })

    } catch (error) {
        console.error('Error al subir el manual:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor al procesar el archivo.' }, { status: 500 })
    }
}