# Pendientes implementados — versión local

Fecha: 10 de octubre de 2026. Base ERP_AmigableDB. Veintidós tablas propias definidas con SUMI_; Windows/MySQL muestra los nombres en minúsculas. Código en rama `codex/erp-roadmap-completion`.

## Estado de las diez mejoras

| # | Resultado operativo |
|---|---|
| 1 | API autenticada y comandos comerciales calculados en servidor sobre MySQL. Migración previa conservada; el cliente deja de enviar una instantánea comercial como autoridad. |
| 2 | Login por empresa/usuario, scrypt para contraseñas, sesiones opacas de ocho horas con hash en SQL y cookie HttpOnly/SameSite. Permisos de lectura y escritura comprobados en backend; usuarios inactivos pierden acceso. |
| 3 | Revisión y bloqueo de empresa para operaciones, claves idempotentes y validación de saldo/stock en servidor. Dos usuarios autenticados cobrando simultáneamente la misma cuenta: una escritura aprobada y otra en conflicto. |
| 4 | Respaldo previo por operación, restauración comprobada y archivos JSON al arrancar y cada hora en `backups/`. Restaurar negocio conserva usuarios, roles y credenciales actuales. No hay purga automática ni copia en otro equipo/disco. |
| 5 | Decimal.js en cálculos comerciales, saldos y principales cálculos fiscales. Dinero a dos decimales HALF_UP; cantidades a seis y tasas hasta ocho. Respaldo rechaza precisión que SQL redondearía. No se recalculan documentos históricos. |
| 6 | Auditoría asociada al usuario autenticado, comandos, IDs y versiones. Reversos internos de cobros/pagos vinculados al original, sin eliminarlo ni ejecutar operaciones bancarias. Reapertura de cierre requiere motivo. |
| 7 | Reservas, transferencias, devoluciones parciales de venta/compra y créditos a favor/reembolsos internos. Unidades con serial: recepción, traslado, venta, devolución y reventa, con historial. |
| 8 | Conciliación manual de importe/moneda/referencia; cierre por tipo/moneda/período con saldo inicial, documentos, ajustes, movimiento neto y saldo final. Impide operaciones retroactivas del período cerrado; reapertura explícita. |
| 9 | Filtros personales guardados en Inventario y cuentas por cobrar/pagar; búsqueda existente conservada. Menú, Inicio y Caja comprobados a 390×844 sin desbordamiento horizontal de página. Las tablas mantienen scroll dentro de su contenedor. |
| 10 | Alertas de vencimientos y disponibilidad mínima actualizadas por cambios y cada minuto en Inicio; sugerencia para alcanzar mínimo, sin generar pedidos. Asistente calcula cifras desde la empresa autorizada y entrega referencias. Gemini opcional añade comentario separado, con envío expreso del usuario. |

## Acceso y uso

Administrador inicial aprobado explícitamente por el usuario: `admin`, empresa `empresa-local`. Contraseña aleatoria en `work/ERP-admin-access.txt`, excluido de Git. No reutiliza la contraseña root de MySQL. El archivo contiene el acceso inicial: si el usuario cambia la contraseña o el nombre de usuario, ese archivo no se actualiza.

Crear perfiles/roles en Configuración; habilitar una contraseña en Acceso de usuarios. Credenciales se guardan en SUMI_credentials y sesiones en SUMI_sessions, fuera de los respaldos comerciales. El propietario conserva acceso completo y no puede desactivarse. Los roles definen view/create/edit por módulo; lectura de documentos incluye datos de referencia necesarios para representarlos. Los campos bancarios se restringen fuera de Caja.

Devoluciones en Ventas/Compras. Conciliación, cierre, créditos y reversos en Caja y cuentas, dentro del bloque desplegable. Historial de operaciones en Configuración → Auditoría. Seriales existentes sin entradas documentadas no se inventan: las unidades nuevas entran por recepción. Los registros históricos sin trazabilidad necesitan completar sus datos antes de transferir/devolver unidades por serial.

Servicios: `npm run api` y `npm run dev`. La API permanece en 127.0.0.1:3002 y el ERP en 127.0.0.1:5173. Las credenciales de conexión MySQL continúan solo en .env.

## Pruebas ejecutadas

67 pruebas aprobadas, 0 fallidas, 0 omitidas con `ERP_MYSQL_TEST=1`; build exitoso. Incluyen MySQL real, login, permisos rechazados, aislamiento de empresas, usuarios inactivos, credenciales conservadas después del guardado, dos usuarios concurrentes, idempotencia, rollback, restauración, devoluciones/reembolsos, cierre/reapertura, reversos, ciclo de serial y filtros personales. Los datos de prueba se crearon en empresas temporales y se limpiaron por su ID; no se añadieron transacciones de prueba a la empresa real.

Se inició sesión con el administrador aprobado y se comprobó el navegador en móvil. La opción Gemini se probó con respuestas simuladas: rechaza comentario numérico y conserva cifras canónicas. No se ejecutó el modelo externo porque GEMINI_API_KEY no está configurada; no se enviaron datos empresariales a Google durante la verificación.

## Política y límites

Se conserva representación JSON numérica compatible con el ERP: importes/valores calculados admitidos hasta 1.000.000.000.000 por valor; tasas hasta 1.000.000; cantidades hasta 1.000.000.000. La validación de precisión/rango evita truncamiento silencioso al persistir. Conversión usa tasa explícita; no se mezclan USD/VES en un total y no se alteran tasas de documentos existentes. [Decimal.js](https://mikemcl.github.io/decimal.js/) documenta precisión y HALF_UP.

Los archivos de respaldo están fuera de MySQL pero en el mismo equipo: no cubren pérdida del disco. El guardado relacional todavía reemplaza filas dentro de una transacción por empresa, conservando identidades y credenciales; no se declara capacidad medida para grandes volúmenes. No se ejecutó una campaña completa de E2E en todos los dispositivos ni auditoría externa de seguridad. La emisión fiscal certificada y validación SENIAT siguen fuera de este alcance.

Gemini es opcional y requiere clave válida en .env. La interfaz informa que envía pregunta y resumen a Google; está desactivado por defecto y se reinicia al cambiar de usuario/empresa. Las cifras verificadas se muestran siempre por separado; un comentario generado no se presenta como una nueva cifra de negocio ni ejecuta comandos. [API oficial de Gemini](https://ai.google.dev/gemini-api/docs/interactions-overview.md). Las consultas verificadas locales funcionan sin esa clave.

No se publicó en producción ni se sustituyó la marca. La comparación con la instancia privada de Odoo sigue basada en documentación pública; no se accedió a pantallas privadas ni se copió código de Odoo.
