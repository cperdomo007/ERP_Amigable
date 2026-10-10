# ERP Amigable

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

El archivo render.yaml permite alojar esta demo como sitio estático: build `npm ci && npm run build`, carpeta `dist`. La interfaz requiere una API autenticada conectada a MySQL para operar. El sitio estático por sí solo no despliega la API MySQL local; se requiere adaptar el alojamiento antes de publicar esta versión conectada.

## Siguiente etapa para producción

### MySQL local

La base seleccionada es `ERP_AmigableDB`; todas las tablas llevan prefijo `SUMI_`. El esquema y comandos de migración, importación y exportación están en `server/mysql`. Consultar `server/mysql/README.md` antes de ejecutarlos. La interfaz ya lee y guarda mediante la API MySQL. Ejecutar `npm run api` además de `npm run dev`. Configurar credenciales únicamente en `.env`.

Autenticación, permisos de servidor, cálculo decimal, auditoría, comandos de negocio y respaldos locales están implementados. Para producción quedan alojamiento seguro, respaldos externos, escalabilidad y requisitos fiscales.

## Acceso y mejoras actuales

Administrador local: admin; empresa: empresa-local. Acceso inicial en work/ERP-admin-access.txt, excluido de Git. Ejecutar npm run api y npm run dev. Usuarios/roles/contraseñas se administran en Configuración; los permisos se comprueban en servidor.

Devoluciones en Ventas/Compras. Conciliación, cierres, reembolsos y reversos en Caja y cuentas. Auditoría en Configuración. Filtros personales en Inventario y diarios. Trazabilidad de seriales desde recepción. Alertas y asistente con cifras verificadas desde MySQL. Gemini opcional requiere clave y selección explícita para enviar pregunta/resumen a Google.

La descripción vigente, política decimal, pruebas y límites están en replica/12-roadmap-implemented.md. Informes anteriores documentan el estado histórico, no capacidades actuales.
