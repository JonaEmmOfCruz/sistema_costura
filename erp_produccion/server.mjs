import { createServer } from 'node:http'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development'
const hostname = process.env.APP_HOST || '0.0.0.0'
const port = Number(process.env.PORT) || 3001
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const autoAssignPaths = new Set([
  '/api/admin_costura/corte/finalizar',
  '/api/admin_costura/papelera/restaurar',
  '/api/operadores/habilitar',
  '/api/operadores/deshabilitar',
  '/api/productos/crud',
  '/api/productos/subir-tiempos',
  '/api/productos/peticiones/aprobar',
  '/api/ordenes/subir',
  '/api/operador/costura/finalizar',
  '/api/costura-tiempos/terminar',
])
const readOnlyPostPaths = new Set([
  '/api/reportes/dinamicos',
  '/api/productos/buscar_modelo',
])

const httpServer = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname
  const method = request.method || 'GET'

  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  ) {
    response.once('finish', () => {
      if (
        response.statusCode < 200 ||
        response.statusCode >= 300 ||
        readOnlyPostPaths.has(pathname)
      ) return

      const notifyClients = () => {
        io.emit('data:changed', { path: pathname, method })
      }

      if (autoAssignPaths.has(pathname)) {
        const baseUrl = `http://127.0.0.1:${port}`
        fetch(`${baseUrl}/api/admin_costura/auto_asignar`, { method: 'POST' })
          .then(async (result) => {
            if (!result.ok) {
              console.error('No se pudo ejecutar la auto-asignación tras actualizar datos:', result.status)
            }
            notifyClients()
          })
          .catch((error) => {
            console.error('Error al ejecutar auto-asignación en tiempo real:', error)
            notifyClients()
          })
        return
      }

      notifyClients()
    })
  }

  handle(request, response)
})

const io = new Server(httpServer, {
  path: '/socket.io',
})

app.prepare().then(() => {
  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
