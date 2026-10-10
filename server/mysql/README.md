# MySQL local — ERP Amigable

Objetivo: MySQL 8.0.16 o posterior, InnoDB, base `ERP_AmigableDB`. Todas las tablas propias usan `SUMI_`. Configurar MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER y MYSQL_PASSWORD en `.env` local. El servidor debe tener creada la base antes de ejecutar las migraciones; no se crean cuentas ni bases automáticamente.

1. Ejecutar `npm run db:migrate`. Crea tablas aditivas y registra versión en SUMI_migrations. DDL en MySQL tiene commits implícitos: si falla, corregir el problema y repetir; no se afirma atomicidad del esquema completo.
2. Descargar respaldo JSON desde Configuración → Respaldos del ERP.
3. Ejecutar `npm run db:import -- ruta-del-respaldo.json empresa-local`. Valida y agrega una empresa nueva dentro de una transacción. No reemplaza una empresa existente. Conserva IDs, campos adicionales y estructuras fiscales en payload/settings; crea filas normalizadas para contactos, productos, documentos, líneas, stock y pagos. Usuarios importados no tienen contraseña ni acceso habilitado por esta herramienta.
4. Ejecutar `npm run db:export -- empresa-local ruta-nueva.json`. Exporta una instantánea validada; se niega a sobrescribir un archivo existente. Comparar cantidades, saldos y registros con el respaldo original antes de usar datos migrados.

Estado actual: veintidós tablas SUMI_, login/permisos, API de comandos calculados en servidor, idempotencia, respaldos, auditoría por usuario, conciliaciones, cierres, reversos, seriales y filtros. Ver `replica/12-roadmap-implemented.md` para la evidencia y límites. El cliente ya no envía instantáneas comerciales sin autoridad de servidor. La migración local previa se conserva.

Las columnas monetarias usan DECIMAL y el driver devuelve decimales como texto. Cálculos comerciales usan Decimal.js; JSON conserva números dentro de límites explícitos. Dinero con dos decimales HALF_UP, cantidades con seis, tasas con ocho. El validador rechaza valores fuera de precisión/rango. Payloads y columnas normalizadas se escriben en la misma transacción.

Fuera de la entrega local: copia de respaldo en otro disco/equipo, política de purga, validación fiscal certificada y pruebas de volumen/dispositivos completas. Gemini está preparado pero no ejecutado contra el proveedor, por falta de clave. No se inventa trazabilidad de seriales históricos sin entradas documentadas.

Referencia: [MySQL InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html) y [claves foráneas](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
