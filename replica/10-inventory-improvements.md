# Primera etapa de mejoras basadas en procesos de Odoo

Implementado en la rama `codex/inventory-improvements`:

- Reservas manuales completas de órdenes confirmadas pendientes de facturación, con liberación explícita.
- Consulta por depósito de físico, reservado y disponible; búsqueda por SKU/nombre.
- Facturas, ajustes negativos y transferencias respetan las reservas de otras órdenes. Facturar una orden consume su reserva sin un segundo descuento.
- Transferencias con salida y entrada vinculadas, preservación del total y validación de pares al restaurar respaldo.
- Panel de órdenes pendientes y registro de transferencias en Productos y stock.

Compatibilidad: los pedidos existentes sin el campo `reservationActive` siguen sin reserva; no se modifican automáticamente. Se conserva el circuito actual que descuenta stock al facturar. Las reservas son de cantidades, sin asignar seriales específicos. Las transferencias de productos con serial permanecen bloqueadas hasta implementar el ciclo completo de entradas por serial.

Validación ejecutada: 52 pruebas aprobadas, 0 fallidas; build exitoso. Se verificó en el navegador que el panel de disponibilidad, reservas y transferencias aparece en Productos y stock. Los casos de operaciones y restauración se comprobaron mediante pruebas automatizadas de dominio; no se cargaron datos de prueba en la base del usuario. Logs locales: `work/inventory-tests.txt` y `work/inventory-build.txt`.

Pendiente del diagnóstico general: backend y autenticación efectiva, concurrencia multiusuario, persistencia decimal, respaldo automático, entregas/facturación parcial, factura de proveedor separada, devoluciones y reversos, crédito del cliente, trazabilidad integral por serial y alertas. Requiere continuar en etapas; esta entrega no declara completado todo el roadmap. Para alojamiento se solicitó la preferencia del usuario; no se contrataron servicios ni se ejecutó despliegue de producción.

Referencia metodológica: documentación pública de Odoo consultada durante el diagnóstico; la instancia privada sigue sin recorrido autenticado. No se copiaron código ni recursos de Odoo.
