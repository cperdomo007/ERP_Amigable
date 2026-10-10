# MySQL local — ERP Amigable

Objetivo: MySQL 8.0.16 o posterior, InnoDB, base `ERP_AmigableDB`. Todas las tablas propias usan `SUMI_`. Configurar MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER y MYSQL_PASSWORD en `.env` local. El servidor debe tener creada la base antes de ejecutar las migraciones; no se crean cuentas ni bases automáticamente.

1. Ejecutar `npm run db:migrate`. Crea tablas aditivas y registra versión en SUMI_migrations. DDL en MySQL tiene commits implícitos: si falla, corregir el problema y repetir; no se afirma atomicidad del esquema completo.
2. Descargar respaldo JSON desde Configuración → Respaldos del ERP.
3. Ejecutar `npm run db:import -- ruta-del-respaldo.json empresa-local`. Valida y agrega una empresa nueva dentro de una transacción. No reemplaza una empresa existente. Conserva IDs, campos adicionales y estructuras fiscales en payload/settings; crea filas normalizadas para contactos, productos, documentos, líneas, stock y pagos. Usuarios importados no tienen contraseña ni acceso habilitado por esta herramienta.
4. Ejecutar `npm run db:export -- empresa-local ruta-nueva.json`. Exporta una instantánea validada; se niega a sobrescribir un archivo existente. Comparar cantidades, saldos y registros con el respaldo original antes de usar datos migrados.

Estado: esquema y herramientas preparados, pero conexión real bloqueada por ER_ACCESS_DENIED_ERROR al usar root sin contraseña configurada. No se ejecutó importación real ni se creó ninguna tabla. No hay API comercial ni login implementados en esta etapa. La interfaz sigue utilizando localStorage. SUMI_idempotency y SUMI_audit preparan las siguientes etapas, pero crear sus tablas no significa que todos los movimientos ya sean idempotentes o auditados.

Las columnas monetarias SQL usan DECIMAL y el driver devuelve decimales como texto. El dominio actual sigue calculando con Number: la política decimal integral y su regresión están pendientes. Los payload JSON preservan datos originales de migración; una futura API deberá mantenerlos coherentes con las columnas normalizadas.

Pendiente del 03-gap: API autorizada por empresa, credenciales de usuarios, permisos, bloqueo transaccional de stock/cobros, idempotencia, trabajos de respaldo automático y recuperación, auditoría operacional, devoluciones, conciliación/cierre, filtros guardados y alertas. Reservas y transferencias ya existen en la versión local previa; no constituyen todavía operaciones multiusuario.

Referencia: [MySQL InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html) y [claves foráneas](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
