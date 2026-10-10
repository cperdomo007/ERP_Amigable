# MySQL local — ERP Amigable

Objetivo: MySQL 8.0.16 o posterior, InnoDB, base `ERP_AmigableDB`. Todas las tablas propias usan `SUMI_`. Configurar MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER y MYSQL_PASSWORD en `.env` local. El servidor debe tener creada la base antes de ejecutar las migraciones; no se crean cuentas ni bases automáticamente.

1. Ejecutar `npm run db:migrate`. Crea tablas aditivas y registra versión en SUMI_migrations. DDL en MySQL tiene commits implícitos: si falla, corregir el problema y repetir; no se afirma atomicidad del esquema completo.
2. Descargar respaldo JSON desde Configuración → Respaldos del ERP.
3. Ejecutar `npm run db:import -- ruta-del-respaldo.json empresa-local`. Valida y agrega una empresa nueva dentro de una transacción. No reemplaza una empresa existente. Conserva IDs, campos adicionales y estructuras fiscales en payload/settings; crea filas normalizadas para contactos, productos, documentos, líneas, stock y pagos. Usuarios importados no tienen contraseña ni acceso habilitado por esta herramienta.
4. Ejecutar `npm run db:export -- empresa-local ruta-nueva.json`. Exporta una instantánea validada; se niega a sobrescribir un archivo existente. Comparar cantidades, saldos y registros con el respaldo original antes de usar datos migrados.

Estado actualizado: esquema aplicado y conexión real verificada. La API local guarda en MySQL y la interfaz usa su proxy Vite. SUMI_idempotency, SUMI_audit y SUMI_backups participan del guardado transaccional de la instantánea. La primera carga migra la copia original del navegador y la conserva. Ver `replica/11-mysql-connected.md` para la validación y los límites, especialmente ausencia de login/permisos y cálculo de dominio aún con Number.

Las columnas monetarias SQL usan DECIMAL y el driver devuelve decimales como texto. El dominio actual sigue calculando con Number: la política decimal integral y su regresión están pendientes. Los payload JSON preservan datos originales de migración; una futura API deberá mantenerlos coherentes con las columnas normalizadas.

Pendiente del 03-gap: API de comandos autorizados por empresa, credenciales de usuarios, permisos, cálculo decimal integral, auditoría operacional por usuario, devoluciones, conciliación/cierre, filtros guardados y notificaciones. El guardado de instantáneas ya tiene bloqueo transaccional, revisión, idempotencia, respaldo automático y restauración comprobada. Faltan copias externas y retención. Reservas y transferencias operan con persistencia MySQL, pero todavía no constituyen un circuito multiusuario con roles efectivos.

Referencia: [MySQL InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html) y [claves foráneas](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
