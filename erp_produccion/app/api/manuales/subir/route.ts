import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
    try {
        const data = await request.formData()
        const file: File | null = data.get('file') as unknown as File

        if (!file) {
            return NextResponse.json({ success: false, message: 'No se ha proporcionado ningún archivo.' }, { status: 400 })
        }

        // Validar extensiones permitidas (.png, .jpg, .jpeg, .pdf)
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ 
                success: false, 
                message: 'Formato no válido. Solo se permiten archivos PNG, JPG o PDF.' 
            }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Generar un nombre único para evitar sobreescrituras
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.name)
        const filename = `${path.basename(file.name, ext)}-${uniqueSuffix}${ext}`
        
        // Ruta física donde se guardará (carpeta public/uploads)
        const uploadDir = path.join(process.cwd(), 'public/uploads')
        
        // Asegurarse de que la carpeta uploads exista (la crea si no existe)
        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)

        const rutaPublica = `/uploads/${filename}`

        // Guardar el registro en la base de datos
        await pool.query(
            `INSERT INTO manuales_produccion (nombre_original, nombre_archivo, ruta, tamanio, tipo) VALUES (?, ?, ?, ?, ?)`,
            [file.name, filename, rutaPublica, file.size, file.type]
        )

        return NextResponse.json({ 
            success: true, 
            message: 'Manual subido correctamente al servidor.' 
        })

    } catch (error) {
        console.error('Error al subir el manual:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor al procesar el archivo.' }, { status: 500 })
    }
}