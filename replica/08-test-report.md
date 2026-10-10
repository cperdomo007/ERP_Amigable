# Validación de la mejora de respaldos

Fecha: 10 de octubre de 2026. Rama: `codex/backup-validation`.

Implementado: validación de respaldos versión 1 en `src/backup-validation.mjs`, expuesta mediante la API existente `domain.validateImport`. Comprueba IDs, unicidad de RIF/SKU/números, referencias, tipos/estados, fechas, líneas, importes, orígenes y ciclos, pagos y estructuras opcionales de roles, usuarios e impuestos. Conserva el objeto original y sus extensiones; no transforma ni guarda datos. README actualizado según capacidades observadas.

`npm test`: 48 pruebas aprobadas, 0 fallidas; incluye las 29 originales y 19 nuevas. Casos nuevos: roundtrip completo con notas, recepción, cuenta manual, pagos y datos opcionales; duplicados, referencias inexistentes, tipos/estados incorrectos, fecha imposible, valores no finitos, cantidades negativas, ciclo de origen, pagos incompatibles, permisos incorrectos y estructuras mal formadas. Registro: `work/replica-backup-tests.txt`.

`npm run build`: exitoso. Registro: `work/replica-backup-build.txt`. Persisten advertencias de Lucide y tamaño de chunks.

Se comprobó mediante lectura que el manejador de importación valida antes de abrir el diálogo y que solo la confirmación escribe el respaldo en localStorage. No se ejecutó una prueba de interfaz con una base real. La validación no certifica conciliación de totales ni cumplimiento fiscal; tampoco migra datos antiguos inválidos. La carga inicial ya utilizaba este mismo validador y conserva su comportamiento previo de recurrir a una base vacía si el almacenamiento es inválido, sin borrar directamente el valor almacenado.

No se cambiaron circuitos comerciales. El repositorio local partía sin commits y con los archivos de aplicación sin rastrear. Por solicitud posterior del usuario, la base completa con esta mejora se registra como versión inicial en GitHub. Los registros de ejecución en `work/` permanecen locales y no forman parte del repositorio publicado.
