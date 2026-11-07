Aplicación de gestión de producción construida con [Next.js](https://nextjs.org).

## Getting Started

Inicia el servidor personalizado (incluye Socket.IO):

```bash
pnpm dev
```

Abre [http://localhost:3001](http://localhost:3001) en el equipo servidor.

## Acceso desde otros dispositivos de la red local

El servidor escucha en todas las interfaces de red (`0.0.0.0`) y, al iniciar, muestra las direcciones LAN disponibles. En otro dispositivo conectado a la misma red Wi-Fi o Ethernet, abre la dirección indicada, por ejemplo `http://192.168.1.25:3001`. Se debe incluir `:3001`; escribir solo la IP intenta conectarse al puerto web predeterminado y no a esta aplicación.

Si no aparece una dirección LAN o no se puede conectar:

- Confirma que ambos dispositivos estén en la misma red y que el router no tenga aislamiento entre clientes o red de invitados.
- Permite conexiones entrantes al puerto TCP `3001` en el firewall del equipo servidor, limitado a la red privada.
- No configures `APP_HOST` como `localhost` o `127.0.0.1`; déjalo sin definir para usar `0.0.0.0`.

El acceso descrito es para una red local confiable; no expongas el puerto directamente a Internet.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Ejecución en equipos con pocos recursos

Para reducir la memoria que usa el servidor al arrancar, activa el modo de bajo consumo al iniciar la aplicación:

```bash
LOW_RESOURCE_MODE=true pnpm start
```

También puedes definir `LOW_RESOURCE_MODE=true` en el entorno del servicio que ejecuta la aplicación. En este modo Next.js carga las rutas bajo demanda en vez de precargarlas todas al iniciar; la primera visita a una ruta puede tardar un poco más. Durante `next dev`, Turbopack libera con mayor frecuencia la memoria de su caché persistente. Si no defines la variable, se conserva la precarga predeterminada y la política automática de caché para priorizar la respuesta en servidores con más recursos.

En pantallas de hasta 1024 px se reducen animaciones y transiciones decorativas; en dispositivos táctiles los controles tienen un área mínima de 44 px. Los cronómetros de costura y corte se actualizan en componentes aislados para que el resto de la pantalla no se vuelva a renderizar cada segundo.

## Documentación con Storybook

Storybook contiene la [guía de usuario](stories/Documentacion/Guia-de-usuario.mdx), la [guía técnica](stories/Documentacion/Guia-tecnica.mdx) y el [mapa de páginas, rutas API y base de datos](stories/Documentacion/Mapa-del-sistema.mdx). Para consultarlas, ejecuta desde este directorio:

```bash
pnpm storybook
```

Para generar el sitio estático de documentación:

```bash
pnpm build-storybook
```

El repositorio también incluye el workflow `/.github/workflows/deploy-storybook.yml`, que compila y publica Storybook en GitHub Pages al actualizar `main`. Para habilitar la primera publicación, abre **Settings → Pages** en el repositorio y selecciona **GitHub Actions** como fuente. Después de que termine el workflow, la dirección será `https://jonaemmofcruz.github.io/sistema_costura/`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
