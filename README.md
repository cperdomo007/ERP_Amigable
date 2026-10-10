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

Esta versión guarda en MySQL mediante una API local en 127.0.0.1:3002. La interfaz usa 127.0.0.1:5173. La primera carga migra la copia local del navegador si la empresa no existe, sin borrar esa copia. Cada escritura usa transacción, revisión e idempotencia; una sesión desactualizada recibe un conflicto y debe recargarse. Todavía no incluye autenticación ni permisos efectivos por usuario; solo acceso desde el equipo local. No se considera lista para producción.

El asistente consulta Gemini mediante `server/ai.mjs`. Configurar `GEMINI_API_KEY` y, opcionalmente, `GEMINI_MODEL` en `.env`, usando `.env.example` como referencia, y ejecutar `npm run ai` además de `npm run dev`. Escucha en 127.0.0.1:3001 y permite el frontend de 127.0.0.1:5173. Envía preguntas, historial reciente y un resumen del negocio al proveedor. Una respuesta real requiere credenciales válidas y no se verifica con las pruebas locales. Las claves privadas nunca deben estar en React.

Los documentos calculan descuentos e IVA. Existen libros de compras/ventas, retenciones internas y exportación TXT IVA/XML ISLR con validación estructural; aceptación tributaria pendiente de comprobar. Se pueden editar clientes/proveedores y productos, gestionar seriales en venta/entrega y generar notas comerciales de crédito/débito. Las recepciones generan deuda interna; factura del proveedor separada pendiente. No incluye emisión fiscal certificada, contabilidad completa, devoluciones ni reversos. Cobros/pagos son registros internos. Operaciones en la moneda del documento; pagos cruzados pendientes.

## Inventario: disponibilidad y transferencias

En Productos y stock se consulta stock físico, reservado y disponible por depósito. Las órdenes confirmadas pendientes de facturar permiten reservar todas sus cantidades o liberar la reserva. Reservar no mueve existencias. Una factura confirmada consume la reserva de su propia orden y descuenta stock; otras facturas, ajustes negativos y transferencias respetan las reservas. Liberar la reserva permite editar la orden nuevamente. Los pedidos existentes comienzan sin reserva y se reservan manualmente.

Transferir entre depósitos registra una salida y una entrada vinculadas en una sola escritura local, sin cambiar el stock total. Requiere cantidad positiva, motivo y depósitos diferentes. Productos con serial todavía no admiten transferencia hasta incorporar trazabilidad de entradas. El respaldo verifica que cada transferencia tenga sus dos movimientos balanceados. Estas operaciones se guardan en una transacción MySQL con control de revisión. Las pestañas desactualizadas deben recargar; no hay acceso efectivo por usuario todavía.

## Validación del respaldo

En Configuración → Respaldos, el JSON versión 1 se valida antes de abrir la confirmación de reemplazo: identificadores, referencias, tipos, estados, cantidades e importes finitos, fechas, usuarios/roles y estructuras fiscales opcionales. Un error identifica el campo y evita importar. Los campos adicionales compatibles se conservan sin transformar IDs ni saldos. Campos fiscales de exportación pueden estar vacíos mientras el registro está en preparación; se validan al exportar.

La validación estructural no certifica conciliación contable ni cumplimiento fiscal. Descargar una copia antes de confirmar el reemplazo. Los roles locales todavía no habilitan autenticación ni permisos efectivos.

## Render

El archivo render.yaml permite alojar esta demo como sitio estático: build `npm ci && npm run build`, carpeta `dist`. El sitio público mostrará una demo vacía; los datos quedan en el navegador del visitante. El sitio estático por sí solo no despliega la API MySQL local; se requiere adaptar el alojamiento antes de publicar esta versión conectada.

## Siguiente etapa para producción

### MySQL local

La base seleccionada es `ERP_AmigableDB`; todas las tablas llevan prefijo `SUMI_`. El esquema y comandos de migración, importación y exportación están en `server/mysql`. Consultar `server/mysql/README.md` antes de ejecutarlos. La interfaz ya lee y guarda mediante la API MySQL. Ejecutar `npm run api` además de `npm run dev`. Configurar credenciales únicamente en `.env`.

Completar autenticación y permisos de servidor, cálculo decimal integral, auditoría por usuario, escalabilidad y requisitos fiscales. MySQL, guardado transaccional, revisión, idempotencia y respaldos automáticos por operación ya están conectados. La API actual guarda instantáneas validadas de una empresa local; no sustituye una API de operaciones de negocio autorizadas.
