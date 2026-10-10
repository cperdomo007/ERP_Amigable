# Propuesta funcional para ERP Amigable en construcción

## Decisión de producto

Conservar React/Vite y los circuitos existentes. Usar Odoo como referencia de procesos. El objetivo inicial es una comercializadora con operación clara de compras, inventario, ventas y cuentas, antes de ampliar a módulos adicionales. Esta orientación se infiere del repositorio; prioridades comerciales todavía no confirmadas.

## Brechas concretas verificadas en código

1. Facturación y salida física acopladas: `confirmDocument` descuenta stock al confirmar Venta; Nota de entrega no descuenta. Consecuencia: el saldo físico baja antes de registrar entrega. Propuesta: separar facturación de despacho, mantener vínculos y permitir entrega parcial. Esta modificación cambia reglas existentes y requiere migrar sin volver a descontar ventas históricas.
2. Una factura por pedido: `createDocument` rechaza cualquier segunda Venta con el mismo origen; `invoiceFromOrder` toma todas las líneas. Propuesta: cantidades pendientes de facturar y facturación parcial, evitando exceder la orden.
3. No hay reserva: confirmar Pedido no reserva existencias. Dos pedidos pueden comprometer el mismo stock y el problema aparece al facturar. Propuesta: mostrar físico, reservado y disponible, con política explícita para reservar y liberar.
4. Compra, recepción y deuda acopladas: `receive` crea un documento Recepción que también habilita pago. Propuesta: factura del proveedor independiente, vinculada a recepciones y con control de diferencias entre pedido, recibido y facturado.
5. Nota de crédito limitada al saldo pendiente: `createInvoiceNote` impide acreditar una factura totalmente cobrada. Propuesta: crédito a favor del cliente y aplicación/reembolso separado; no ejecutar movimientos bancarios.
6. Seriales sin ciclo completo: se controlan seriales por documento confirmado del mismo tipo, pero no se encontró registro de unidades recibidas, ubicadas y disponibles por serial. Propuesta: trazabilidad de entrada, transferencia, salida y devolución.
7. Restauración incompleta: `validateImport` no verifica exhaustivamente duplicados, contactos de documentos, líneas, estados y origen. Propuesta: validación integral, previsualización y rechazo sin alterar datos.
8. Sin reversos de operaciones confirmadas: solo se eliminan borradores sin relaciones. Propuesta: operaciones compensatorias vinculadas, motivo, autor y fecha; conservar historial.
9. Perfiles sin seguridad aplicada: configuración local de roles sin login ni autorización. Propuesta: permisos efectivos en API y pruebas de aislamiento.
10. Persistencia y dinero: localStorage y Number limitan operación compartida y precisión. Propuesta: API transaccional con decimales, claves idempotentes y respaldo recuperable.

Estos son hallazgos estáticos, no errores reproducidos en UI. No se afirma que todos sean defectos: varios son decisiones simplificadas apropiadas para una demo, que deben revisarse al evolucionar.

## Referencias verificadas

[Ventas Odoo](https://www.odoo.com/documentation/19.0/applications/sales/sales.html) documenta cotización, orden, entrega y facturación.

[Políticas de facturación](https://github.com/odoo/odoo/blob/19.0/addons/sale/README.md) describe facturación basada en distintas modalidades, incluida entrega.

[Inventario Odoo](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp.html) documenta reservas, recepciones por pasos y devoluciones. [Tipos de producto](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/type.html) describe movimientos físicos por transferencias, recepciones y entregas.

La instancia del usuario sigue pendiente de reconocimiento autenticado. Estas fuentes describen el producto general, no sus módulos instalados. No se instalaron habilidades Replica.

## Secuencia ajustada

### MVP — consolidar la base

Registrar una base revisable en Git; corregir documentación; fortalecer restauración; definir estados y cantidades de cada circuito; introducir API, autenticación, persistencia decimal, idempotencia y respaldo. Añadir pruebas de restauración inválida, permisos, concurrencia y conservación de saldos. Conservar datos existentes mediante migración versionada y comprobación de totales.

### V2 — completar la operación

Reserva de pedidos, entregas parciales, facturación parcial, factura del proveedor separada, transferencias, devoluciones y crédito del cliente. Trazabilidad por serial. Cada circuito debe conciliar cantidades pedidas, recibidas/entregadas, facturadas y saldos. Definir explícitamente tratamiento de datos históricos antes de cambiar el punto de descuento de stock.

### V3 — mejorar productividad

Filtros guardados, tablero de pendientes, reposición y vencimientos, medición de rendimiento, validación móvil y asistente de consulta. Evaluar nuevas integraciones según necesidad comercial y datos fiables.

## Primer cambio propuesto para aprobación

Fortalecer exclusivamente la restauración JSON y actualizar el README para reflejar las capacidades reales. No altera los circuitos comerciales y prepara una migración posterior más segura.

Criterios de aceptación:

- Un respaldo válido de la versión actual conserva IDs, documentos, cantidades y saldos.
- Rechazar IDs duplicados, referencias inexistentes, valores no finitos y estados/tipos inválidos con mensajes útiles.
- Verificar estructuras opcionales de empresa, roles, usuarios y datos fiscales sin descartar campos compatibles.
- Ningún respaldo inválido sustituye la base actual.
- Pruebas nuevas cubren respaldos corruptos y roundtrip; las 29 pruebas existentes siguen aprobadas y el build compila.

Pendiente de aprobación para implementar. No se cambió código en este análisis ni se programó trabajo recurrente.
