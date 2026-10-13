# Sistema de gestión de producción y costura

**Documento de presentación, guía de usuario y referencia técnica funcional**
**Versión documentada:** estado del proyecto en la rama `main`, después del cambio al catálogo de tiempos de productos.

---

## 1. Resumen ejecutivo

El sistema es una aplicación web interna para organizar información de producción y coordinar el flujo de órdenes que pasan por corte y costura. Reúne en un mismo lugar la carga de órdenes y tiempos, la preparación de la cola de corte, la disponibilidad de operadores, la asignación de trabajo, el registro de tiempos reales y la consulta de resultados.

Está pensado para tres perfiles:

- **Administrador:** prepara los datos de producción, gestiona usuarios y manuales, revisa indicadores y exporta información.
- **Administrador de costura:** depura la cola de órdenes, controla el proceso de corte y habilita operadores para que reciban trabajo.
- **Operador:** consulta su orden activa, revisa el tiempo sugerido y el manual del producto, y registra el tiempo de ejecución.

El sistema facilita el seguimiento y la distribución del trabajo, pero no reemplaza los sistemas corporativos que originan las órdenes. Los archivos cargados y los datos de la base deben mantenerse bajo procedimientos de respaldo y control de acceso.

## 2. Guion sugerido para una presentación

1. **Necesidad que atiende:** contar con una vista compartida de las órdenes que requieren corte y costura, y reducir el seguimiento manual de asignaciones y tiempos.
2. **Cómo funciona:** administración carga órdenes y métricas; costura prepara y corta las órdenes; el sistema distribuye el trabajo entre operadores habilitados; cada operador registra su ejecución.
3. **Perfiles de acceso:** administración general, administración de costura y operador, con pantallas diferentes según su función.
4. **Control de tiempos:** el catálogo conserva información de varias operaciones, pero el flujo de costura utiliza exclusivamente el campo de tiempo de costura.
5. **Visibilidad de resultados:** panel de indicadores, consulta de órdenes, historial de corte y exportación de datos.
6. **Beneficio operativo esperado:** facilitar la coordinación, identificar carga pendiente y comparar el tiempo sugerido con el tiempo registrado.
7. **Próximos pasos recomendados:** formalizar formatos de carga, documentar procedimientos de contingencia, reforzar controles de acceso y definir respaldos de base de datos y archivos.

## 3. Perfiles y responsabilidades

| Perfil | Responsabilidad | Funciones visibles principales |
|---|---|---|
| Administrador | Mantener la información general y supervisar la producción. | Inicio e indicadores, carga de órdenes, manuales, tiempos y productos, usuarios, exportación de datos. |
| Administrador de costura | Preparar el trabajo del área y administrar el flujo de corte y operadores. | Órdenes de costura, corte, cola de órdenes, disponibilidad de operadores, consulta de órdenes asignadas y papelera. También hay un acceso externo al sistema de insumos. |
| Operador | Ejecutar las órdenes que le fueron asignadas. | Ver orden activa o pausada, consultar cantidades y tiempos, iniciar y detener el registro de costura y consultar el manual disponible. |

El acceso comienza en la pantalla de identificación de empleado. El sistema busca ese número en el catálogo de usuarios y dirige a la persona al área correspondiente. En la versión actual la pantalla solicita el número de empleado y no presenta un campo de contraseña; se recomienda que la organización confirme si este mecanismo satisface su política de acceso.

## 4. Mapa de pantallas

Las rutas indicadas son direcciones internas de la aplicación. El menú puede mostrar nombres abreviados.

### Administración general

| Pantalla | Dirección | Para qué sirve |
|---|---|---|
| Inicio | `/admin` | Indicadores de costura, corte, asignaciones y tendencias. Permite revisar periodos y consultar por intervalo de fechas. |
| Carga de órdenes | `/admin/subir_ordenes` | Importar órdenes desde CSV y consultar órdenes, asignaciones, cortes y tiempos de costura. |
| Gestión de tiempos | `/admin/subir_tiempos` | Importar el catálogo de tiempos, revisar solicitudes de métricas y mantener productos y tiempos. |
| Manuales | `/admin/subir_manuales` | Cargar manuales de producción y consultar los archivos ya registrados. |
| Usuarios | `/admin/usuarios` | Registrar, consultar, editar y eliminar cuentas de usuario. |
| Exportar datos | `/admin/exportar` | Descargar la información disponible en Excel o PDF, de forma general, por fechas o por tabla. |

### Administración de costura

| Pantalla | Dirección | Para qué sirve |
|---|---|---|
| Inicio de costura | `/admin_costura` | Página de bienvenida del área. |
| Órdenes y corte | `/admin_costura/ordenes` | Revisar órdenes destinadas a costura, iniciar y terminar cortes, apartar órdenes en espera y enviar órdenes ajenas al área a la papelera. |
| Historial de órdenes cortadas | `/admin_costura/asignar_orden` | Consultar órdenes cortadas y su distribución automática o manual a los operadores. |
| Operadores | `/admin_costura/operadores` | Habilitar o deshabilitar operadores y consultar sus asignaciones vigentes. Habilitar a una persona la hace elegible para recibir trabajo durante el periodo configurado por el sistema. |
| Papelera | `/admin_costura/papelera` | Consultar órdenes retiradas de la cola y restaurarlas cuando corresponda. |
| Insumos | Enlace externo | Abre un sistema independiente de insumos; no es una pantalla de este proyecto. |

### Operador

| Pantalla | Dirección | Para qué sirve |
|---|---|---|
| Estación del operador | `/operador` | Presentar la orden activa, las pausadas, el tiempo sugerido, el tiempo acumulado, los controles de inicio y finalización y el manual vinculado al producto. |

## 5. Guía de usuario

### 5.1 Iniciar sesión

1. Abrir la dirección de la aplicación.
2. Introducir el número de empleado asignado.
3. Seleccionar **Ingresar al sistema**.
4. Si no se reconoce el número o el perfil no está configurado, solicitar apoyo a administración.

La sesión del sistema se emite por un periodo de cinco horas. Al expirar, puede ser necesario volver a identificarse.

### 5.2 Cargar órdenes de producción

1. Ingresar como administrador y abrir **Órdenes**.
2. Preparar un CSV con una fila de encabezados y los datos en este orden: `rq`, `op`, `producto`, `nombre`, `observaciones`, `cantidad`, `cliente`, `prioridad`, `orden`, `vigente_desde`, `fecha_de_entrega`.
3. Separar los valores con punto y coma (`;`) y verificar que las fechas y cantidades sean correctas.
4. Seleccionar o arrastrar el archivo CSV y elegir **Importar Órdenes**.
5. Revisar el mensaje de resultado y consultar las tablas de la pantalla.

**Importante:** la carga agrega órdenes a producción y al área de costura; no funciona como una actualización de órdenes existentes. Revisar el archivo antes de volver a cargarlo para evitar duplicados.

Desde la pantalla se puede abrir una consulta del módulo de costura con pestañas para asignaciones, cortes y tiempos registrados por operadores.

### 5.3 Importar y atender tiempos de productos

1. Ingresar como administrador y abrir **Tiempos**.
2. Importar el archivo de catálogo en formato `.xltx`, `.xlsx`, `.xls` o `.csv`.
3. En el formato nuevo, comprobar que existan los encabezados: `id_proceso`, `cod_proceso`, `descripcion`, `costura`, `t_costura`, `tapizado`, `t_tapizado`, `armado`, `t_armado`, `montado`, `t_montado`, `empaque`, `t_empaque`, `corte` y `t_corte`.
4. Seleccionar **Importar** y revisar el resultado: cuántos productos se actualizaron, cuántas filas no tenían código y cuántos códigos repetidos se consolidaron.
5. Revisar las solicitudes de tiempo pendientes. Al asignar tiempo, el sistema puede proponer datos de un producto parecido; revisar y, si hace falta, editar el código, la descripción, la operación de costura y el tiempo antes de confirmar. El tiempo se captura en segundos por unidad. Si la solicitud no corresponde, se puede rechazar.
6. Consultar o filtrar el catálogo para comprobar los datos cargados.

La pantalla presenta las operaciones del catálogo, pero **no muestra `id_proceso`**. Ese dato puede venir en el archivo y se mantiene para el registro interno. Las métricas de tapizado, armado, montado, empaque y corte describen otras operaciones: **el trabajo de costura usa solo `t_costura`**.

La importación consolida registros repetidos por código de proceso y actualiza el catálogo existente. Para el formato nuevo, las columnas deben identificarse con los encabezados anteriores. La aplicación también conserva compatibilidad con archivos anteriores que incluyen campos como `codigo`, `nombre_secundario`, `costura` y `tiempo`.

### 5.4 Cargar manuales de producción

1. Ingresar como administrador y abrir **Manuales**.
2. Seleccionar un archivo PDF, PNG o JPG.
3. Confirmar el código que se detecta a partir del nombre del archivo y cargarlo.
4. Buscarlo en la tabla y utilizar **Ver Manual** para comprobar el archivo.

El sistema intenta relacionar el manual con el código del producto a partir de su nombre. Para nombres con prefijo numérico de hasta tres caracteres separado por guiones, toma el segmento siguiente; por ejemplo, `102-1361N-00-23.pdf` se relaciona con `1361N`. Conviene acordar y mantener una convención de nombres uniforme.

### 5.5 Preparar la cola de costura y controlar el corte

1. Ingresar como administrador de costura y abrir **Órdenes**.
2. Revisar productos, cantidades, prioridades y datos de cada orden.
3. Retirar a la papelera las órdenes que no correspondan al área. Se pueden restaurar desde **Papelera**.
4. Para poner una orden en espera, elegir un motivo —falta de tela, problema de calidad o cambio de fecha— y confirmar. La orden debe reanudarse antes de iniciar su corte.
5. Iniciar el corte de la primera orden disponible. El panel muestra el tiempo transcurrido.
6. Al terminar, seleccionar **Finalizar Corte**. La orden queda disponible para el proceso de asignación según su prioridad y la capacidad registrada.
7. Consultar el historial de corte y las asignaciones para seguir el avance.

La asignación considera la disponibilidad de los operadores y el tiempo de costura del catálogo. La lógica de capacidad trabaja con una jornada de referencia de hasta ocho horas (480 minutos). Las órdenes prioritarias pueden adelantar trabajo normal y provocar que una asignación se pause para conservar su progreso.

### 5.6 Habilitar operadores

1. Abrir **Operadores**.
2. Revisar quién está disponible y qué trabajo tiene asignado.
3. Habilitar a quienes deban participar en el ciclo de asignación o deshabilitar a quienes no deban recibir nuevas órdenes.
4. Confirmar en pantalla que cambió la disponibilidad y revisar las asignaciones.

Una asignación no necesariamente significa que la costura ya está en ejecución: el operador debe iniciar su tarea desde su propia estación.

### 5.7 Registrar trabajo como operador

1. Ingresar con el número de empleado.
2. Revisar la OP activa, el producto y la cantidad asignada.
3. Consultar el tiempo sugerido. Este se calcula usando `t_costura` multiplicado por la cantidad asignada; los tiempos de otras operaciones no se utilizan para esta sugerencia.
4. Abrir el manual disponible en la misma pantalla, si existe.
5. Iniciar la costura al comenzar el trabajo y finalizarla al concluir la tarea.
6. Si la orden se pausa por una prioridad, el tiempo previamente registrado se conserva y se muestra entre las órdenes pausadas.
7. Si el producto no tiene una métrica registrada, enviar una solicitud de tiempo para que administración la revise.

### 5.8 Exportar información

1. Ingresar como administrador y abrir **Exportar datos**.
2. Elegir una exportación general o seleccionar el modo por fechas y completar el intervalo.
3. Descargar todas las tablas o seleccionar una tabla individual.
4. Elegir el formato Excel o PDF cuando esté disponible.

La pantalla indica el número de tablas y registros disponibles. Por protección, la exportación omite las sesiones y los campos de autenticación.

## 6. Flujo operativo de principio a fin

1. **Preparación de datos:** administración mantiene catálogo de productos, tiempos y manuales, y carga las órdenes del periodo.
2. **Revisión de área:** costura identifica órdenes que sí pertenecen al proceso, aparta excepciones y gestiona la cola de corte.
3. **Corte:** se registra el inicio y fin del proceso para cada orden.
4. **Asignación:** las órdenes cortadas pasan a los operadores habilitados, con distribución basada en prioridad, cantidad y capacidad estimada.
5. **Ejecución de costura:** cada operador inicia y termina su registro; las pausas conservan los tiempos acumulados.
6. **Seguimiento:** administración consulta indicadores, órdenes y asignaciones; los datos pueden exportarse para análisis externo.
7. **Mantenimiento del catálogo:** las solicitudes sin tiempo se atienden y los productos se actualizan para que futuras asignaciones tengan una métrica correcta.

## 7. Información que organiza el sistema

| Grupo de información | Contenido funcional |
|---|---|
| Usuarios y sesiones | Número de empleado, nombre, área, tipo de usuario y vigencia de sesión. |
| Órdenes de producción | RQ, OP, código de producto, descripción, observaciones, cantidad, cliente, prioridad y fechas. |
| Catálogo de productos y tiempos | Código de proceso, descripción y operación/tiempo de costura, tapizado, armado, montaje, empaque y corte. El identificador `id_proceso` es de uso interno. |
| Cola de corte y asignaciones | Estado de la orden, operador asignado, cantidad, prioridad, tiempos de corte y estado de la asignación. |
| Registros de costura | Operador, OP, cantidad, inicio, fin y duración acumulada. |
| Disponibilidad de operadores | Periodo durante el cual un operador puede recibir nuevas asignaciones. |
| Solicitudes de tiempos | Producto pendiente de revisión, código, OP, estado y fecha de solicitud. |
| Manuales | Archivo, tipo, código de relación, tamaño y ubicación. |
| Espera y papelera | Motivo y fecha de espera, o información de una orden retirada que puede restaurarse. |

Los nombres exactos de algunas tablas pueden variar según el esquema instalado y sus migraciones. Para consultas o integraciones, confirmar siempre el esquema real de la base objetivo; no utilizar este documento como sustituto de un respaldo o diccionario actualizado de base de datos.

## 8. Tecnologías y propósito

| Tecnología | Función explicada en términos prácticos |
|---|---|
| Next.js 16 | Base de la aplicación web; organiza las pantallas y los servicios que responden a las acciones del usuario. |
| React 19 | Permite que las pantallas actualicen tablas, indicadores y formularios sin recargar toda la aplicación. |
| TypeScript 5 | Ayuda a detectar inconsistencias en los datos y cambios antes de que el sistema se publique. |
| Tailwind CSS 4 | Herramienta utilizada para presentar las pantallas y adaptarlas a distintos tamaños. |
| MySQL 8 | Base de datos relacional que conserva órdenes, catálogo de productos, operadores, asignaciones y tiempos. |
| Socket.IO | Comunica cambios para refrescar información visible en las pantallas conectadas. |
| ExcelJS y SheetJS (`xlsx`) | Lectura de archivos de hojas de cálculo y preparación de exportaciones. |
| Recharts | Representación visual de estadísticas y tendencias. |
| jsPDF y jsPDF AutoTable | Generación de exportaciones en PDF. |
| pnpm | Administrador de dependencias y comandos del proyecto. |

La aplicación se ejecuta como un solo producto web. El servidor HTTP personalizado prepara las páginas y mantiene el canal en tiempo real en el mismo proceso.

## 9. Estructura del proyecto

| Carpeta o archivo | Explicación |
|---|---|
| [`app/`](./app) | Pantallas, páginas y servicios web. Las subcarpetas representan áreas funcionales. |
| [`app/api/`](./app/api) | Servicios que leen o modifican información de la base, reciben archivos y procesan acciones de usuario. |
| [`components/`](./components) | Elementos reutilizables: navegación, tablas, formularios, estadísticas y actualización en tiempo real. |
| [`lib/`](./lib) | Recursos compartidos, como conexión a la base de datos y actualización de pantallas. |
| [`database/migrations/`](./database/migrations) | Cambios versionados para crear o adaptar estructuras de la base de datos. |
| [`public/`](./public) | Imágenes, logotipo y archivos accesibles por la aplicación. Los manuales cargados se guardan en `public/uploads/`. |
| [`server.mjs`](./server.mjs) | Arranque del servidor web y coordinación de los avisos de cambio en tiempo real. |
| [`package.json`](./package.json) | Tecnologías instaladas y comandos disponibles para desarrollo, compilación y ejecución. |
| [`README.md`](./README.md) | Actualmente contiene la guía inicial estándar de Next.js, no una descripción operativa de este sistema. |

### Servicios web por área

- **Acceso y sesión:** `/api/login` y `/api/me`.
- **Órdenes:** `/api/ordenes`, `/api/ordenes/subir`.
- **Productos y tiempos:** `/api/productos/tiempos`, `/api/productos/subir-tiempos`, `/api/productos/crud`, `/api/productos/buscar_modelo`.
- **Solicitudes de métricas:** `/api/productos/peticiones`, `/api/productos/peticiones/aprobar`, `/api/productos/peticiones/rechazar`.
- **Manuales:** `/api/manuales` y `/api/manuales/subir`.
- **Costura y operadores:** `/api/operadores`, `/api/operadores/habilitar`, `/api/operadores/deshabilitar`, `/api/admin_costura/asignar`, `/api/admin_costura/auto_asignar`, `/api/operador/asignaciones`, `/api/operador/costura/iniciar`, `/api/operador/costura/finalizar`.
- **Corte y recuperación:** servicios bajo `/api/admin_costura/corte`, `/api/admin_costura/papelera` y `/api/admin_costura/ordenes/espera`.
- **Indicadores y extracción:** `/api/admin/analisis`, `/api/admin/exportar`, `/api/reportes/esquema` y `/api/reportes/dinamicos`.

El componente de construcción dinámica de reportes está disponible en el proyecto, pero no se encontró conectado a una pantalla principal o una opción del menú; por ello no se describe como una función operativa accesible para todos los usuarios.

## 10. Operación y configuración

### Requisitos generales

- Un servidor compatible con Node.js para ejecutar la aplicación.
- MySQL 8 accesible desde ese servidor.
- Acceso de red desde los equipos de trabajo al servidor web y a la base según el diseño de instalación.
- Espacio persistente y respaldado para la base de datos y los archivos cargados.

### Configuración del entorno

Los valores se proporcionan en el entorno de ejecución; no deben incluirse en este documento ni compartirse en repositorios o presentaciones:

| Variable | Propósito |
|---|---|
| `DB_HOST` | Servidor de MySQL. |
| `DB_PORT` | Puerto de MySQL. |
| `DB_USER` | Cuenta de conexión a la base. |
| `DB_PASSWORD` | Clave de esa cuenta. |
| `DB_NAME` | Base que utiliza la aplicación. |
| `JWT_SECRET` | Clave privada para emitir y verificar sesiones. Debe ser única y configurarse con un valor seguro. |
| `APP_HOST` | Dirección de escucha del servidor. |
| `PORT` | Puerto HTTP; si no se especifica, el servidor utiliza `3001`. |

Si las variables de conexión no se definen, el proyecto contiene valores locales predeterminados para conectarse a MySQL. En una instalación real se deben configurar explícitamente los datos autorizados y evitar usuarios o claves de ejemplo. El código tiene un secreto alternativo para sesiones cuando `JWT_SECRET` falta: establecer la variable segura antes de operar y revisar este comportamiento como parte de la preparación del entorno.

### Comandos de referencia

- `pnpm run dev`: iniciar para desarrollo, en el puerto configurado o `3001`.
- `pnpm run build`: preparar la versión de producción.
- `pnpm run start`: ejecutar la aplicación preparada para producción.
- `pnpm run lint`: revisar convenciones y posibles problemas estáticos.

### Archivos y respaldos

Los manuales se escriben en `public/uploads/` y se referencia su ruta en la base de datos. El respaldo operativo debe incluir **la base de datos y esos archivos**, de forma coordinada. En despliegues con almacenamiento temporal, confirmar que los archivos no desaparezcan al reiniciar o sustituir el servidor. El historial conversacional indicó que las migraciones de octubre de 2026 se aplicaron a la base utilizada durante la adaptación; antes de ejecutar una migración en otra instalación, verificar la estructura y obtener un respaldo.

## 11. Observaciones y recomendaciones

1. **Acceso:** la pantalla actual identifica al empleado por número, sin contraseña. Antes de ampliar el acceso fuera de la red interna, revisar con el área responsable el método de autenticación y comprobar que cada servicio de datos verifique el perfil autorizado; ocultar opciones del menú no sustituye una validación del lado del servidor.
2. **Clave de sesión:** configurar siempre `JWT_SECRET` con un valor propio y protegido. No compartir archivos de entorno, cookies, identificadores de sesión ni respaldos con información real.
3. **Carga de órdenes:** no reutilizar un archivo ya importado sin confirmar si las órdenes deben agregarse otra vez. Mantener una plantilla con columnas y separador estables.
4. **Catálogo:** validar que los códigos del Excel coincidan con los códigos de las órdenes. Un código faltante o distinto puede impedir que el producto reciba tiempo sugerido para costura.
5. **Unidades de tiempo:** la asignación y el panel del operador tratan `t_costura` como segundos. Confirmar que los archivos de origen usen la misma unidad antes de importar; una diferencia de unidad altera las estimaciones y la capacidad.
6. **Manuales:** normalizar los nombres de archivo para que el código de relación se extraiga correctamente y el operador encuentre el documento adecuado.
7. **Respaldos y retención:** definir frecuencia de respaldo, pruebas de restauración y periodo de conservación de manuales y datos de trabajo.
8. **Documentación del producto:** reemplazar la guía genérica del README y los metadatos de plantilla que aún aparecen en el proyecto por información institucional revisada.
9. **Reportes:** confirmar con los responsables si el componente de reportes dinámicos debe exponerse como pantalla; actualmente no se identificó un acceso desde las páginas visibles.
10. **Control de operación:** acordar quién valida altas de usuarios, prioridades, tiempos de catálogo, correcciones y restauraciones desde la papelera.

## 12. Glosario

| Término | Significado |
|---|---|
| RQ | Referencia de requerimiento asociada a una orden. |
| OP | Orden de producción que se sigue en el flujo de planta. |
| Código de producto / proceso | Identificador que relaciona una orden con su descripción, tiempo y, cuando aplica, manual. |
| Tiempo sugerido | Referencia calculada desde el tiempo estándar de costura y la cantidad asignada; no representa por sí misma el tiempo real transcurrido. |
| Tiempo registrado | Duración acumulada entre el inicio y la finalización de la costura del operador. |
| Cola de corte | Órdenes que costura revisa y prepara antes de asignarlas a las estaciones de trabajo. |
| Orden en espera | Orden apartada temporalmente por un motivo operativo hasta que pueda reanudarse. |
| Papelera | Área para órdenes retiradas de la cola que todavía pueden restaurarse. |
| Migración | Cambio planificado de estructura de base de datos que debe revisarse y respaldarse antes de aplicarse. |
