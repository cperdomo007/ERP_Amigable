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

## Estado verificado al 10 de octubre de 2026

MySQL local conectado a ERP_AmigableDB. Todas las tablas propias se definen con prefijo SUMI_; en Windows MySQL las presenta en minúsculas. Interfaz y API local operativas. Migración inicial ejecutada conservando la copia del navegador. No existe actualmente un bloqueo de credenciales.

| # | Estado | Evidencia y trabajo restante |
|---|---|---|
| 1 | Implementado para uso local | API de instantáneas, persistencia MySQL, transacciones y migración. Pendiente API de comandos comerciales autorizados. |
| 2 | Pendiente | Sin login ni permisos efectivos; acceso del propietario local. El esquema separa empresas, pero no acredita aislamiento entre usuarios autenticados. |
| 3 | Parcial | Revisión, bloqueo de empresa e idempotencia probados en MySQL. Pendiente validación de comandos de stock/cobros en servidor y pruebas con roles reales. |
| 4 | Implementado con límite | Respaldo previo por escritura y restauración comprobada. Copias dentro de la misma base; pendiente respaldo externo y política de retención. |
| 5 | Parcial | Columnas SQL DECIMAL; cálculos de dominio todavía con Number. Política decimal integral pendiente. |
| 6 | Parcial | Auditoría de guardados y respaldos previos. Pendiente identidad del usuario, detalle por operación y correcciones comerciales trazables. |
| 7 | Parcial | Reservas y transferencias operativas. Pendientes devoluciones y trazabilidad completa por serial. |
| 8 | Pendiente | Diario y saldos disponibles; conciliación y cierre de cuentas no implementados. |
| 9 | Parcial | Búsquedas existentes. Pendientes filtros guardados y validación completa de móvil. |
| 10 | Parcial | Panel de vencimientos/stock y puente Gemini de consulta. Pendientes notificaciones, reposición automatizada y verificación real de IA. |

Validación ejecutada: 56 pruebas aprobadas, incluida integración MySQL real con concurrencia, idempotencia, documentos/pagos, restauración y rollback. Compilación exitosa. Evidencia y límites en `replica/11-mysql-connected.md`.

El MVP completo todavía no cumple el criterio de dos usuarios autenticados con permisos diferentes. La siguiente dependencia es login y autorización de servidor, seguida de comandos comerciales y cálculo decimal. El reconocimiento autenticado de Odoo permanece pendiente.
