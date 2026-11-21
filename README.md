# Pyme 360 v1.5

Entrega 1.5.0. Arquitectura: React y Node.js en Render; MySQL `railway` y API móvil independiente en Railway; app Android Flutter en `mobile`. Configuración y pendientes en [deploy/README.md](deploy/README.md). No se ha verificado ni realizado el despliegue en las cuentas del proveedor. El código histórico Java/React de `android` se conserva como referencia; la entrega móvil vigente es Flutter.

La app Flutter **Pyme 360** está en [`mobile`](mobile/README.md). Reutiliza la interfaz React empaquetada y sus módulos, con conexión y sesión administradas en Dart. Para un teléfono real se necesita una dirección HTTPS accesible de la API Railway.

Primera versión funcional de prueba en React para una comercializadora en Venezuela. Incluye clientes/proveedores, productos, depósitos, ajustes, presupuestos, pedidos, ventas, pedidos de compra, recepciones parciales, cuentas pendientes, cobros/pagos parciales y panel general. Importes en USD o VES con tasas históricas. Exportación CSV y respaldo JSON.

## Ejecutar

Requiere Node.js y npm. Ejecutar `npm install`, luego `npm run dev`. Para compilar: `npm run build`. Pruebas: `npm test`.

## Circuito de prueba

### Clientes en Excel

En Clientes y proveedores: Exportar clientes descarga un .xlsx con todos los contactos Cliente o Ambos, sin filtros; Plantilla Excel descarga los encabezados y las instrucciones; Importar clientes acepta .xlsx (hasta 5 MB y 10.000 registros), valida filas y muestra una vista previa. Nombre y RIF son obligatorios. Conserva teléfonos como texto. Omite RIF duplicados y no modifica existentes. Si hay errores no permite confirmar. La importación se guarda completa o no se guarda ningún registro.

1. Crear un contacto de tipo Ambos, un producto y, opcionalmente, otro depósito.
2. Registrar pedido de compra, confirmarlo y recibir mercancía total o parcialmente.
3. Registrar venta, guardarla como borrador y confirmarla para descontar stock.
4. En Caja y cuentas registrar cobros y pagos parciales. Incluso las ventas de contado requieren registrar su cobro.
5. Revisar stock, cuentas y movimientos de caja en Inicio. Descargar respaldo desde Configuración.

## Límites explícitos

Esta versión guarda en MySQL mediante una API local en 127.0.0.1:3002. La interfaz usa 127.0.0.1:5173. La importación local se valida y se ejecuta mediante los comandos de migración documentados. Cada escritura usa transacción, revisión e idempotencia; una sesión desactualizada recibe un conflicto y debe recargarse. Incluye login y permisos de servidor por empresa; continúa limitado al equipo local. No se considera lista para producción.

El asistente usa la API autenticada para mostrar cifras verificadas de MySQL. Gemini es opcional, requiere GEMINI_API_KEY y consentimiento explícito en la interfaz. Recibe la pregunta y un resumen mínimo; su comentario se muestra separado de los resultados calculados.

Los documentos calculan descuentos e IVA. Existen libros de compras/ventas, retenciones internas y exportación TXT IVA/XML ISLR con validación estructural; aceptación tributaria pendiente de comprobar. Se pueden editar clientes/proveedores y productos, gestionar seriales en venta/entrega y generar notas comerciales de crédito/débito. Las recepciones generan deuda interna; factura del proveedor separada pendiente. Incluye devoluciones y reversos trazables; quedan fuera la emisión fiscal certificada y la contabilidad completa. Cobros/pagos son registros internos. Operaciones en la moneda del documento; pagos cruzados pendientes.

## Inventario: disponibilidad y transferencias

En Productos y stock se consulta stock físico, reservado y disponible por depósito. Las órdenes confirmadas pendientes de facturar permiten reservar todas sus cantidades o liberar la reserva. Reservar no mueve existencias. Una factura confirmada consume la reserva de su propia orden y descuenta stock; otras facturas, ajustes negativos y transferencias respetan las reservas. Liberar la reserva permite editar la orden nuevamente. Los pedidos existentes comienzan sin reserva y se reservan manualmente.

Transferir entre depósitos registra una salida y una entrada vinculadas en una sola escritura local, sin cambiar el stock total. Requiere cantidad positiva, motivo y depósitos diferentes. Las transferencias de productos con serial requieren unidades registradas desde la recepción. El respaldo verifica que cada transferencia tenga sus dos movimientos balanceados. Estas operaciones se guardan en una transacción MySQL con control de revisión. Las pestañas desactualizadas deben recargar; el acceso se comprueba por usuario y empresa.

## Validación del respaldo

En Configuración → Respaldos, el JSON versión 1 se valida antes de abrir la confirmación de reemplazo: identificadores, referencias, tipos, estados, cantidades e importes finitos, fechas, usuarios/roles y estructuras fiscales opcionales. Un error identifica el campo y evita importar. Los campos adicionales compatibles se conservan sin transformar IDs ni saldos. Campos fiscales de exportación pueden estar vacíos mientras el registro está en preparación; se validan al exportar.

La validación estructural no certifica conciliación contable ni cumplimiento fiscal. Descargar una copia antes de confirmar el reemplazo. Los roles se verifican en el servidor. Las credenciales se administran aparte y no se sustituyen al restaurar datos comerciales.

## Render

El archivo `render.yaml` configura un servicio Node gratuito: compila React y sirve `dist` y `/api/erp` desde el mismo origen. `DATABASE_URL` apunta a MySQL de Railway; `DATABASE_SSL=true` verifica su certificado. La API móvil se configura por separado con `railway.toml`. Ver [deploy/README.md](deploy/README.md).

## Siguiente etapa para producción

### MySQL local

La base seleccionada es `ERP_AmigableDB`; todas las tablas llevan prefijo `SUMI_`. El esquema y comandos de migración, importación y exportación están en `server/mysql`. Consultar `server/mysql/README.md` antes de ejecutarlos. La interfaz ya lee y guarda mediante la API MySQL. Ejecutar `npm run api` además de `npm run dev`. Configurar credenciales únicamente en `.env`.

Autenticación, permisos de servidor, cálculo decimal, auditoría, comandos de negocio y respaldos locales están implementados. Para producción quedan alojamiento seguro, respaldos externos, escalabilidad y requisitos fiscales.

## Acceso y mejoras actuales

### Usuarios para web y Android

En Configuración → Roles se definen permisos de consulta, creación y modificación por módulo. En Configuración → Usuarios se crea el perfil y se asigna un rol. Después de guardar un usuario nuevo, se abre la asignación de contraseña; también se accede desde el botón Contraseña del listado. La contraseña requiere entre 12 y 256 caracteres y confirmación. El perfil y la contraseña se guardan en pasos separados: el perfil nuevo no puede iniciar sesión hasta asignar la contraseña. Crear perfiles requiere permiso de creación en Configuración; editar perfiles y asignar contraseñas requiere permiso de modificación.

Web y Android nativo usan la misma empresa, usuario y contraseña. Desactivar un usuario impide iniciar sesión y bloquea las siguientes solicitudes de sus sesiones existentes. El cambio de contraseña guarda un hash scrypt, revoca todas las sesiones de ese usuario y registra auditoría, dentro de una transacción. El propietario debe permanecer activo. Las contraseñas y tokens no forman parte del respaldo comercial.

La API admite la app Pyme 360 y otros clientes Android nativos mediante el siguiente contrato:

- `POST /api/erp/auth/login`, encabezado `X-ERP-Client: mobile`, JSON `{ "company": "empresa-local", "username": "usuario", "password": "contraseña" }`. Devuelve el estado autorizado junto con `accessToken`, `tokenType: "Bearer"` y `expiresIn: 28800` (ocho horas); no emite cookie.
- Las siguientes solicitudes envían `X-ERP-Client: mobile` y `Authorization: Bearer <accessToken>`. Se usan las mismas rutas y permisos de la web. Las escrituras en `/commands` conservan revisión, idempotencia y `expectedActor: { company, userId }`.
- `POST /api/erp/auth/logout` con JSON `{}` revoca el token actual. Ante HTTP 401, borrar el token del dispositivo y solicitar un nuevo inicio de sesión. Guardar el token en almacenamiento protegido del dispositivo, sin registrarlo en logs.

La web conserva su cookie HttpOnly y SameSite=Strict; no recibe tokens en JSON. Se mantiene compatibilidad con `X-ERP-Client: desktop` y se acepta `web`. `ERP_ALLOWED_ORIGINS` define los orígenes web admitidos (separados por coma); no habilita CORS entre dominios. Publicar frontend y `/api/erp` en un mismo origen mediante proxy. En HTTPS, configurar `ERP_SECURE_COOKIES=true`. Los clientes móviles nativos no envían `Origin`.

La API sigue escuchando en 127.0.0.1:3002; para usar un teléfono se requiere un alojamiento o proxy HTTPS accesible desde el dispositivo. MySQL permanece detrás de la API, sin conexión directa desde el móvil. La compilación de la app se documenta en `android/README.md`.

Validación: `npm test`; integración real de usuarios, permisos, aislamiento, login móvil, revocación web/móvil y logout con `$env:ERP_MYSQL_TEST='1'; node --test tests/auth-integration.test.mjs` en PowerShell.

Administrador local: admin; empresa: empresa-local. Acceso inicial en work/ERP-admin-access.txt, excluido de Git. Ejecutar npm run api y npm run dev. Usuarios/roles/contraseñas se administran en Configuración; los permisos se comprueban en servidor.

Devoluciones en Ventas/Compras. Conciliación, cierres, reembolsos y reversos en Caja y cuentas. Auditoría en Configuración. Filtros personales en Inventario y diarios. Trazabilidad de seriales desde recepción. Alertas y asistente con cifras verificadas desde MySQL. Gemini opcional requiere clave y selección explícita para enviar pregunta/resumen a Google.

La descripción vigente, política decimal, pruebas y límites están en replica/12-roadmap-implemented.md. Informes anteriores documentan el estado histórico, no capacidades actuales.
