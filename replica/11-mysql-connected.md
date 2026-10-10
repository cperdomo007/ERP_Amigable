# ERP conectado a MySQL local

Implementado y ejecutado: API en 127.0.0.1:3002, proxy Vite y cliente de persistencia. Lectura y guardado en ERP_AmigableDB con tablas SUMI_. La primera carga importó la empresa local y su contacto existente; se verificaron 1 contacto, 0 productos y 0 documentos en la base. La copia original de localStorage no se borra ni se reemplaza.

Guardado: bloqueo de fila de empresa, revisión, clave idempotente, respaldo de la versión previa y auditoría en la misma transacción. Las filas comerciales se reemplazan únicamente dentro de la empresa y la transacción, respetando claves foráneas. Un fallo revierte el cambio completo. Las confirmaciones de la interfaz esperan la respuesta MySQL. No se usa almacenamiento local como fallback silencioso cuando la API falla.

Respaldos: SUMI_backups conserva cada versión previa sin purga automática. Configuración → Respaldos muestra las últimas 50 versiones y permite elegir una para restaurar mediante el diálogo existente; la restauración también genera un respaldo de la base anterior. Son copias en la misma base, no sustituyen un respaldo externo para pérdida de disco/servidor. La exportación JSON manual y CLI sigue disponible.

Validación: 56 pruebas aprobadas con ERP_MYSQL_TEST=1, ninguna omitida; build exitoso. La integración con MySQL real cubre documentos vinculados, pagos/saldo, stock, escrituras simultáneas, reintento idempotente, restauración y rollback de un fallo SQL. Se creó y eliminó exclusivamente una empresa temporal identificada por UUID. En navegador se verificó carga MySQL y panel de respaldos; no se añadieron datos de prueba a la empresa del usuario.

Límites: API para propietario local, sin login ni autorización por roles. Origen restringido, cabecera obligatoria, sin CORS y escucha solo en loopback. Las funciones comerciales todavía se calculan en cliente; el servidor valida el respaldo, no cada comando de negocio individual. No presentar como un backend multiusuario seguro. Columnas DECIMAL disponibles, cálculo de dominio aún con Number. Los snapshots completos por operación priorizan compatibilidad; se debe evolucionar a comandos y cambios por fila para volumen mayor.

Servicios: `npm run api`, `npm run dev` y opcionalmente `npm run ai`. API y Vite quedaron ejecutándose localmente. Credenciales exclusivamente en .env ignorado por Git. Falta completar otros puntos del 03-gap: permisos, cálculo decimal integral, devoluciones, conciliación/cierre y filtros guardados.
