# ERP Amigable — Diseño de pantallas

## Alcance y evidencia

ERP para una comercializadora de productos en Venezuela. Interfaz React, backend Node.js en Render, base de datos Neon y asistente de IA mediante API. El proveedor de autenticación y el de IA quedan por elegir.

Se inspeccionó visualmente el dashboard de JERP y su navegación. Se observaron filtros de fechas, tarjetas de indicadores, valores en bolívares y dólares, tasa del día, gráficos y secciones de stock bajo y pagos a proveedores. Las pantallas internas no se pudieron recorrer: el nuevo acceso devuelve ERR_BLOCKED_BY_CLIENT. Las siguientes pantallas son propuestas de adaptación, no una descripción verificada de esas páginas.

## Estructura visual compartida

Fondo gris muy claro, tarjetas blancas, sombras suaves, bordes redondeados y azul como color principal. Menú lateral plegable: Inicio, Clientes y proveedores, Productos y stock, Ventas, Compras, Caja y cuentas, Reportes y Configuración. Barra superior con búsqueda, empresa activa, notificaciones y perfil. En móvil, menú desplegable y tablas con desplazamiento horizontal.

Cada listado incluye título, acción principal, búsqueda, filtros, paginación, estado vacío y acceso al detalle. Formularios con etiquetas visibles, validaciones junto al campo y aviso al salir con cambios. Estados de carga y errores con opción de reintentar. Los importes muestran su moneda explícitamente.

## 1. Inicio

Filtros de período y depósito. Indicadores: ventas del mes, cobros, pagos, cuentas por cobrar y cuentas por pagar. Tarjeta de tasa vigente con origen y fecha. Gráfico de ventas; productos más vendidos; stock bajo; vencimientos próximos. Accesos rápidos a nueva venta, nueva compra, registrar cobro y registrar pago. Diferenciar ventas de cobros y resultado de caja de utilidad.

## 2. Clientes y proveedores

Dos pestañas con tablas de nombre, RIF, contacto, condiciones de pago, saldo y estado. Alta y edición: nombre comercial, razón social, RIF, teléfonos, correo, dirección, moneda habitual y plazo de crédito. Una misma entidad puede ser cliente y proveedor.

Detalle con información general, documentos, movimientos y cuentas pendientes. Acción de desactivar con historial conservado. Evitar borrar entidades vinculadas a operaciones.

## 3. Productos y stock

Catálogo: SKU, nombre, categoría, unidad, costo, precio, moneda, existencias y estado. Alta y edición de producto con stock mínimo por depósito. Depósitos con nombre, ubicación y estado.

Detalle del producto: datos, precios e historial de movimientos por depósito. Movimientos con fecha, tipo, cantidad, documento de origen y responsable. Ajustes y transferencias con motivo obligatorio y vista previa. El stock se deriva de movimientos; no se cambia editando el catálogo. Definir la política de stock negativo antes de implementar.

## 4. Ventas

Pestañas de presupuestos, pedidos y ventas. Filtros por cliente, fecha, estado y moneda. Formulario con cliente, productos, cantidades, precios, descuentos, condiciones de pago y totales calculados por el backend.

Presupuestos en borrador que pueden convertirse en pedidos. Pedidos pendientes que pueden convertirse en ventas. Confirmar venta genera salida de stock y cuenta por cobrar en una transacción. Las ventas de contado pueden incorporar un cobro al confirmar. Registrar cobros parciales desde la cuenta correspondiente. No duplicar movimientos al repetir una solicitud.

Detalle con líneas, estado, documentos relacionados, pagos y auditoría. Anulaciones o devoluciones generan movimientos compensatorios según el flujo autorizado; no eliminan el historial. Documentos comerciales exportables, sin afirmar validez fiscal. La emisión fiscal requiere definición y validación aparte.

## 5. Compras

Listado de pedidos a proveedores y recepciones. Pedido con proveedor, productos, cantidades, costos, moneda y condiciones. Recepción contra pedido con cantidades recibidas y pendientes; admitir recepciones parciales.

Confirmar recepción genera entrada de inventario y la obligación correspondiente según el documento comercial registrado, evitando duplicar deuda en recepciones posteriores. Detalle con pedido, recepciones, documentos y pagos. Definir cómo se vinculan factura del proveedor y recepciones antes de programar este circuito.

## 6. Caja y cuentas pendientes

Pestañas: caja y bancos, cuentas por cobrar y cuentas por pagar. Movimientos por cuenta, moneda, fecha, método y documento. Formulario de cobro o pago con contraparte, documentos aplicados, importe, referencia y fecha. Soportar pagos parciales y mostrar saldo restante.

Separar balances por moneda; las conversiones informativas muestran tasa y fecha. Cuentas pendientes con vencimiento, importe original, aplicado y saldo. Historial de aplicaciones de pagos y reversos con motivo. Evitar aplicar más del saldo sin un flujo explícito de anticipo.

## 7. Reportes

Ventas por período y producto, existencias por depósito, movimientos de stock, cuentas vencidas, compras y caja. Filtros consistentes y exportación CSV/Excel. Cálculos realizados en el backend, con definición visible de indicadores y moneda de presentación.

## 8. Configuración y acceso

Empresa: razón social, RIF, dirección y datos de contacto. Monedas y tasas con fecha, origen y responsable. Usuarios por invitación y permisos configurables para administración, ventas, compras, almacén y caja. Las invitaciones y funciones avanzadas dependen del plan del proveedor de autenticación.

Pantallas de inicio de sesión, recuperación de acceso, sesión vencida y acceso denegado. Validar permisos y empresa en el backend para cada operación. Historial de cambios y estrategia de respaldo y recuperación.

## 9. Asistente de IA

Botón persistente que abre un panel lateral y, en móvil, una pantalla completa. Preguntas sugeridas: ventas del mes, stock bajo, cuentas vencidas y ayuda del módulo actual. Respuestas con período, moneda y enlaces a documentos consultados.

Herramientas iniciales: consultar ventas, consultar existencias, listar vencimientos y preparar presupuesto en borrador. Backend autentica, filtra por empresa y permisos y ejecuta consultas parametrizadas. El modelo no recibe credenciales de base de datos ni ejecuta SQL arbitrario. Los cálculos provienen del ERP.

Toda modificación presenta una vista previa y exige confirmación del usuario; guardar auditoría y evitar duplicación. Tratar mensajes y textos de documentos como datos, sin permitirles cambiar permisos. Usar datos ficticios en pruebas y elegir condiciones de tratamiento de datos adecuadas antes de enviar datos reales al proveedor de IA.

## Adaptación de la navegación observada

Dashboard pasa a Inicio. Clientes y Proveedores se agrupan con pestañas. Inventario pasa a Productos y stock. Ventas conserva su sección. CxC y CxP se integran en Caja y cuentas. Roles, Usuarios y Seguridad pasan a Configuración. Reportes conserva su sección. Se agrega Compras como módulo propio. Fiscal, Contabilidad, Conciliación y Emprendimiento quedan fuera de la primera versión definida.

## Pendiente de inspeccionar en el sitio de referencia

Clientes, proveedores, ventas, reportes, subpantallas de inventario, CxC, CxP, fiscal, contabilidad, conciliación manual y automática, emprendimiento, roles, usuarios y seguridad. No se verificaron sus formularios, tablas ni comportamiento. Esta lista refleja enlaces del menú observado, no un inventario exhaustivo de páginas internas.

## Orden de construcción

1. Estructura visual, acceso y permisos.
2. Clientes, proveedores, productos y depósitos.
3. Compras y movimientos de inventario.
4. Presupuestos, pedidos y ventas.
5. Cobros, pagos y cuentas pendientes.
6. Panel y reportes con datos reales.
7. Asistente con consultas y presupuestos en borrador.

## Revisión de nueve capturas aportadas por el usuario

Esta revisión amplía la evidencia anterior: se analizaron imágenes de nueve interfaces, sin probar su comportamiento. Las menciones previas a pantallas pendientes quedan actualizadas por esta sección para las vistas aquí documentadas. No se infiere funcionamiento del backend a partir de las imágenes.

| Captura | Interfaz observada | Adaptación al ERP Amigable |
|---|---|---|
| 1 | Nuevo cliente: nombre, teléfono, email, dirección y casilla de crédito; Guardar y Cancelar. | Agregar RIF, razón social, contactos y condiciones de pago. Al habilitar crédito, mostrar plazo y límite con moneda. Reutilizar estructura para proveedores, con sus propios términos comerciales. |
| 2 | Dashboard: rango de fechas, bienvenida, ventas hoy, clientes, productos, usuarios, tasa e ingresos/egresos. | Priorizar ventas del período, cobros, pagos, cuentas pendientes y stock bajo. Etiquetar qué tarjetas siguen el filtro y cuáles representan el día o el estado actual. Reducir el espacio de bienvenida y dar acceso rápido a operaciones. Mostrar fecha y origen de tasa. |
| 3 | Reportes básicos: ventas USD y equivalente Bs., cantidad, promedio, venta máxima, métodos de pago, productos más vendidos y exportación. | Incorporar filtros por moneda, depósito y cliente, reportes de compras, caja, vencimientos y stock. Identificar método de conversión de los equivalentes. Separar ventas de cobros por método de pago. Exportar el mismo conjunto filtrado y respetar permisos. |
| 4 | Artículos: búsqueda, agregar artículo, estado vacío y página 1. | Mostrar tabla con SKU, producto, categoría, unidad, precio/moneda, stock por depósito y estado. Agregar filtros y accesos a movimientos. En vacío, invitar a crear o importar productos y ocultar paginación innecesaria. |
| 5 | Modal de artículo: nombre, código, precio, imagen URL y descripción. | Usar alta rápida para datos básicos y página completa para costo, moneda, categoría, unidad, stock mínimo y depósito. Código único validado; precios explícitos por moneda. El saldo inicial debe originar un movimiento, no un campo de stock libre. Imagen opcional. |
| 6 | Ventas: número, comprobante, fecha, cliente, total Bs./USD, tasa, condición, método, estado y acciones. | Pestañas Presupuestos, Pedidos y Ventas; búsqueda y filtros. Priorizar número, cliente, fecha, total/moneda, estado comercial y saldo. Llevar equivalentes y tasa al detalle cuando falte espacio. Admitir varios cobros/métodos por venta. |
| 7 | Nueva venta: cliente, contado/crédito, método de pago, líneas de productos y subtotal/IVA/total. | Agregar depósito, moneda, tasa fechada, búsqueda por SKU, disponibilidad y descuentos autorizados. Totales y subtotales de solo lectura. Crédito con vencimiento; contado con cobros y referencias, incluidos pagos mixtos. Acciones Guardar borrador y Confirmar venta. Impuestos configurables: el 16% visible es referencia de la captura, no una regla fiscal validada para el proyecto. |
| 8 | Usuarios: empresa, crear usuario, listado con nombre, correo, rol, estado y último cambio. | Mover a Configuración; mostrar nombre, correo, rol legible, estado de acceso e invitación. No copiar sufijos técnicos de roles. Acciones según permisos: invitar, editar acceso y desactivar. Diseño de columnas que mantenga visibles las acciones. |
| 9 | Crear usuario: datos personales, cédula, teléfono, imagen, usuario, email, contraseña, confirmación y rol. | Sustituir por invitación con nombre, correo y rol/permisos. El usuario configura su acceso mediante el proveedor de autenticación. Cédula e imagen no obligatorias para el ERP inicial salvo necesidad definida. No guardar contraseñas en las tablas comerciales. |

### Decisiones de diseño derivadas

- Mantener menú lateral con iconos, tarjetas claras, encabezados y formularios de dos columnas; adaptar a una columna en móvil.
- Usar azul para acciones principales; reservar verde, ámbar y rojo para estados semánticos y acompañarlos de texto. La referencia mezcla botones verdes y azules para altas: se unifican.
- Reemplazar Emprendimiento por Configuración de empresa y agregar Compras, Proveedores y Caja y cuentas a la navegación de primera versión.
- Usar estados vacíos con una acción útil. Evitar paginación de una única página vacía.
- Mostrar errores junto al campo, cargas, confirmación de guardado y protección frente a doble envío.
- Incorporar el asistente lateral sin ocultar las acciones del formulario. Consultas iniciales de ventas, stock y vencimientos; presupuestos en borrador con vista previa antes de guardar. Los permisos del asistente coinciden con los del usuario.
- Conservar tasas históricas por operación y evitar actualizar importes históricos con la tasa actual.

### Evidencia que todavía falta

Las capturas no muestran listados/detalles de clientes, edición de productos, depósitos, movimientos de stock, proveedores, compras, recepciones, presupuestos, pedidos, caja, cobros, pagos, cuentas pendientes, configuración de tasas ni el asistente. Esas pantallas siguen siendo propuestas de la especificación, sin referencia visual inspeccionada. Tampoco se verificaron validaciones, persistencia, permisos, exportaciones o cálculos de las nueve pantallas capturadas.

## Segunda entrega: cinco capturas adicionales

Se revisaron cinco imágenes adicionales. Dos muestran el dashboard con variantes del menú; las otras muestran registro de pago a proveedor, facturas pendientes de proveedores y catálogo de retenciones. Actualizan la evidencia pendiente de pagos y cuentas por pagar, sin demostrar su funcionamiento ni cubrir todos sus detalles.

| Captura | Evidencia visible | Adaptación propuesta |
|---|---|---|
| 1 | Dashboard con menú ampliado: CxP, Fiscal, CxC, Contabilidad, Proveedores y conciliaciones. Tasa visible en Bs./USD. | Mantener la arquitectura de seis módulos. Agrupar CxP y CxC bajo Caja y cuentas; proveedores dentro de Clientes y proveedores. Compras tiene entrada propia. La tasa de la captura es un valor de ejemplo, no una tasa actual validada. |
| 2 | Registrar pago a proveedor: proveedor, fecha, moneda, selección de facturas, monto, método, banco y referencia. | Usar un flujo de selección de proveedor, documentos pendientes, distribución del pago y revisión final. Mostrar importe aplicado a cada factura y saldo posterior. Elegir cuenta de caja/banco de origen, no solo nombre de banco. Admitir abonos parciales y referencias; mostrar tasa histórica y equivalentes si difieren las monedas. Registrar pago, aplicaciones y movimiento de caja de manera atómica y sin duplicación. |
| 3 | Facturas de proveedores: filtros de fecha, estado y proveedor; número, emisión, vencimiento, total, saldo, estado, días vencidos y acciones. El menú llama Pagos a esta vista. | Renombrar la vista Cuentas por pagar y separar Historial de pagos. Agregar moneda explícita y filtro por vencimiento. Indicadores de saldo pendiente y vencido por moneda. Acciones Ver documento, Registrar pago y Ver aplicaciones. Distinguir días hasta vencer de días de atraso y definir si el filtro de fechas corresponde a emisión o vencimiento. |
| 4 | Menú Fiscal expandido: Retenciones con subnivel repetido, Impuestos y Reportes; el contenido sigue siendo dashboard. | La imagen muestra navegación, no formularios de impuestos ni reportes fiscales. Evitar etiquetas y niveles repetidos. Mantener fiscal fuera del alcance inicial acordado; prever una estructura futura simple en Configuración y Reportes cuando se defina ese alcance. |
| 5 | Catálogo Retenciones: código, descripción, porcentaje, aplica a, estado, acciones y Nueva Retención. | Referencia para futura configuración fiscal, con tipos, vigencias y auditoría una vez definidos los requisitos. No deducir fórmulas, obligaciones ni porcentajes legales de la captura. Los cambios de catálogo no deben recalcular documentos históricos. |

### Flujo adaptado de pago a proveedor

1. Seleccionar proveedor y ver únicamente sus documentos accesibles dentro de la empresa activa.
2. Seleccionar facturas con saldos actualizados y registrar el importe aplicado a cada una.
3. Elegir fecha, moneda, cuenta de origen, método, referencia y tasa cuando haya conversión.
4. Mostrar total del pago, distribución, saldos posteriores y efecto sobre caja antes de confirmar.
5. Validar permisos, saldos y conversiones nuevamente en el backend; confirmar todo en una transacción y registrar responsable y fecha.
6. Mostrar comprobante interno e historial de aplicaciones. Los reversos requieren motivo y generan movimientos compensatorios.

El botón Seleccionar todas de la referencia necesita explicar si selecciona todas las facturas pendientes o solo las visibles. El ERP debe permitir editar cada aplicación. Un excedente requiere un flujo explícito de anticipo; no se distribuye silenciosamente. Registrar el pago documenta una operación en el ERP y no inicia una transferencia bancaria.

### Asistente en cuentas por pagar

Consultas sugeridas: proveedores con saldo pendiente, documentos vencidos y vencimientos de los próximos siete días. Mostrar moneda, fecha de consulta y enlaces a documentos. Puede preparar una propuesta de distribución de un pago, pero la confirmación corresponde al usuario autorizado; los cálculos y verificaciones los realiza el backend.

### Cobertura actualizada

Se dispone de 14 capturas, con varias vistas repetidas de dashboard y navegación. Hay evidencia visual del formulario de pago y del listado de cuentas por pagar. Siguen faltando proveedores, compras y recepciones, cobros y CxC, caja/bancos, depósitos y movimientos, tasas, detalles de documentos y asistente. Del catálogo de retenciones se observó solo el listado vacío; no se inspeccionaron su alta ni comportamiento.
