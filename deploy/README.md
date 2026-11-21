# Pyme 360 v1.5 — Render y Railway

Estado: configuración preparada; no se han inspeccionado paneles ni desplegado servicios. El nombre público definitivo depende de la URL que asigne Render. La API actual usa Node HTTP, sin Express: conserva rutas y permisos del ERP.

## Render: web y API web

Crear un Web Service desde la rama codex/pyme360-v1.5 de este repositorio usando render.yaml (plan free). Seleccionar también esa rama en el servicio API de Railway. Compilación: npm ci && npm run build. Inicio: npm start. Sirve React y /api/erp en el mismo dominio. Variables:

- DATABASE_URL: URL pública TCP de MySQL Railway, base railway. La dirección privada railway.internal no es accesible desde Render.
- DATABASE_SSL=true. MySQL debe aceptar TLS y presentar un certificado verificable. Si usa una CA privada, completar DATABASE_SSL_CA con su PEM. No desactivar validación para resolver errores de certificados; configurar TLS/proxy en el servidor MySQL antes de publicar.
- ERP_ALLOWED_ORIGINS: URL HTTPS exacta de Render, sin barra final.
- ERP_HOST=0.0.0.0, ERP_SERVE_WEB=true, ERP_SECURE_COOKIES=true.
- ERP_FILE_BACKUPS=false: el disco del plan gratuito es efímero; no usarlo para respaldos persistentes.

/healthz consulta MySQL y devuelve 503 si no puede conectar. No basta que React cargue para considerar el despliegue funcional.

## Railway: MySQL y API móvil

Crear MySQL con base railway y servicio independiente para la API desde railway.toml. DATABASE_URL del servicio móvil puede referenciar MYSQL_URL privada de MySQL; configurar DATABASE_SSL según soporte real de ese endpoint. La conexión externa desde Render usa MYSQL_PUBLIC_URL. La API móvil publica HTTPS y mantiene los mismos usuarios, permisos y sesiones Bearer. No usar una segunda base para el móvil.

El Dockerfile de Railway configura ERP_HOST=0.0.0.0, ERP_SERVE_WEB=false, ERP_FILE_BACKUPS=false y ERP_SECURE_COOKIES=true. PORT lo suministra Railway. Configurar ERP_ALLOWED_ORIGINS con la URL de Render si se admitirá uso web; Android nativo no envía Origin y no necesita CORS. Configurar el dominio HTTPS de la API en la app Flutter.

## Migración inicial

Primero crear la base railway. En una terminal privada con DATABASE_URL configurada, ejecutar npm run db:migrate. Exportar JSON comercial desde Configuración > Respaldos de la versión local. Ejecutar npm run db:import -- ruta-del-respaldo.json empresa-local y npm run init:admin. La importación crea una empresa nueva; no reemplaza otra existente. El administrador nuevo se guarda en work/ERP-admin-access.txt, excluido de Git. Importar JSON comercial no migra contraseñas existentes. Para conservar credenciales y sesiones debe migrarse el dump SQL completo del esquema compatible.

Comparar saldos, stock, documentos y usuarios antes del corte. No operar simultáneamente en la base local y nube durante la migración. Las migraciones no se ejecutan automáticamente al iniciar dos servicios concurrentes.

## Copia Railway hacia PC

Dirección prevista: Railway -> PC, lunes a sábado a las 09:00 America/Argentina/Buenos_Aires. La base local prevista es Pyme_360_app; confirmar su nombre real antes de restaurar. Es copia unidireccional: no sube operaciones locales. Reemplazar la copia local puede descartar cambios hechos solamente allí.

En esta entrega no se ha encontrado una tarea programada accesible ni credenciales Railway verificadas; no se afirma que este respaldo esté activo. Antes de habilitarlo: configurar acceso privado a las credenciales, descargar un dump consistente de Railway en backups, generar y comprobar el dump local previo, restaurar en una base temporal, verificar datos y entonces coordinar el reemplazo local con la app detenida. Conservar ambos respaldos y comprobar recuperación. No configurar tareas de restauración a ciegas.

Los JSON comerciales no incluyen credenciales ni sesiones. Para recuperación completa conservar también dumps SQL y copias fuera de la PC. El almacenamiento de respaldos no se sube a GitHub.

## Validación y publicación

npm test; npm run build. Integración local aislada: ERP_MYSQL_TEST=1 node --test tests/auth-integration.test.mjs. La app Flutter se compila según mobile/README.md. Probar instalación, conexión Railway, importación/exportación, impresión y revocación en dispositivo real. La APK de pruebas no sustituye una release firmada con la clave de la empresa.

Pendientes del proveedor: conectar repositorio, definir DATABASE_URL/CA/orígenes, migrar datos, comprobar TLS y salud de ambos servicios, probar operación y habilitar los respaldos. No guardar secretos en el repositorio.

Referencias oficiales: https://render.com/docs/web-services ; https://render.com/docs/free ; https://docs.railway.com/databases/mysql
