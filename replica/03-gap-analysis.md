# Comparación preliminar y prioridades

Esta matriz compara evidencia local con documentación general de Odoo. Todas las capacidades internas de la instancia indicada permanecen sin verificar. No representa una puntuación de paridad.

| Funcionalidad | Odoo general | ERP observado | Acción propuesta |
|---|---|---|---|
| Inicio de sesión | Pantalla observada en instancia | Ausente | Implementar |
| Permisos | Documentados | Configuración sin enforcement | Validar en servidor |
| Persistencia compartida | Pendiente de reconocimiento | localStorage | Implementar backend |
| Inventario | Almacenes/ubicaciones documentados | Depósitos, ajustes y movimientos | Evaluar transferencias y reservas |
| Contabilidad | Asientos integrados documentados | Diario local y libros; equivalencia pendiente | Definir conciliación y alcance |
| Ventas/compras | Flujos de instancia pendientes | Documentos y recepciones parciales | Mantener y validar circuito |
| Reportes | Instancia pendiente | Panel y libros | Filtros y métricas según necesidades |
| Importación Excel | Instancia pendiente | Implementada y con pruebas | Mantener y ampliar validación |
| IA | Instancia pendiente | Puente Gemini de consulta | Validar integración y privacidad |

Fuentes y límites: `01-recon.md`; evidencia técnica: `02-current-app-audit.md`.

## Diez mejoras propuestas

Orden provisional por reducción de riesgo y valor operativo; esfuerzo relativo, sin calendario comprometido. Impacto comercial estimado, no validado con usuarios.

| # | Mejora | Impacto / valor | Complejidad / esfuerzo | Riesgo | Dependencias | Etapa |
|---|---|---|---|---|---|---|
| 1 | API y MySQL con transacciones y migración local; tablas SUMI_ | Alto / alto | Alta / alto | Pérdida al migrar | Modelo y validación de importación | MVP |
| 2 | Login, permisos de servidor y aislamiento empresarial | Alto / alto | Alta / alto | Acceso cruzado | API y empresas | MVP |
| 3 | Idempotencia y control de concurrencia en stock/cobros | Alto / alto | Alta / alto | Doble movimiento | Transacciones | MVP |
| 4 | Respaldos automáticos y restauración comprobada | Alto / alto | Media / medio | Recuperación incompleta | Persistencia compartida | MVP |
| 5 | Dinero decimal y política explícita de cambio/redondeo | Alto / alto | Alta / alto | Alteración de saldos | Modelo y regresión | MVP |
| 6 | Auditoría de operaciones y correcciones trazables | Alto / alto | Media / medio | Historial incompleto | Usuarios y API | MVP |
| 7 | Transferencias, reservas y devoluciones de inventario | Alto / alto | Alta / alto | Doble descuento | Stock transaccional | V2 |
| 8 | Conciliación y cierre de cuentas con documentos vinculados | Alto / alto | Alta / alto | Diferencias contables | Precisión y auditoría | V2 |
| 9 | Búsqueda, filtros guardados y navegación móvil validada | Medio / alto | Media / medio | Complejidad de interfaz | Recorridos y pruebas UI | V2 |
| 10 | Alertas de vencimientos y reposición; IA verificable | Medio / alto | Media / medio | Avisos o respuestas incorrectos | Datos fiables, jobs y política de IA | V3 |

## Roadmap propuesto

MVP: conservar circuitos actuales e implementar 1–6. Criterios: dos usuarios operan sin duplicar stock/pagos; un rol no autorizado es rechazado por API; migración reconcilia cantidades y saldos; restauración recupera una base de prueba. Registrar primero el estado de Git y actualizar documentación. Sin emisión fiscal productiva hasta definir sus requisitos.

V2: implementar 7–9 según reconocimiento autenticado y prioridades de negocio. Criterios: transferencias balanceadas, devoluciones vinculadas, conciliación explicable y flujos comerciales verificables en móvil/escritorio.

V3: implementar 10 y medir uso, tiempos operativos y errores. IA de consulta con datos mínimos, manejo de indisponibilidad y respuestas contrastadas; cualquier automatización de cambios requerirá reglas y autorizaciones específicas.

Estado actualizado: el usuario aprobó implementación y eligió MySQL local, base ERP_AmigableDB y prefijo SUMI_. Validación de respaldos, reservas y transferencias locales implementadas. Esquema MySQL y herramientas de migración/importación/exportación preparados; conexión real pendiente de configurar contraseña (ER_ACCESS_DENIED_ERROR). API comercial, login y demás puntos del roadmap continúan pendientes. Ver server/mysql/README.md para los límites de esta etapa. Reconocimiento autenticado de Odoo sigue pendiente.
