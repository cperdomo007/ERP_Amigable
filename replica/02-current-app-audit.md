# Auditoría preliminar de ERP Amigable

Fecha: 10 de octubre de 2026. Alcance: revisión estática de estructura, dependencias, persistencia, lógica comercial, acceso y servidor de IA; ejecución de pruebas y build. No constituye una auditoría exhaustiva de cada línea ni una validación fiscal.

## Estado observado

- React 19, Vite 8, JavaScript/JSX, ExcelJS y Lucide. Dominio comercial en `src/domain.mjs`; interfaz principal concentrada en `src/main.jsx`, con formularios y libros separados.
- Datos de contactos, productos, depósitos, movimientos, documentos y pagos en localStorage. No se encontró una API comercial, conexión PostgreSQL ni migraciones en los archivos de aplicación inventariados.
- Clientes/proveedores editables, importación/exportación Excel, productos y seriales, compras con recepción parcial, documentos comerciales, cobros/pagos, libros de compras/ventas, exportaciones y configuración empresarial.
- Usuarios y roles son registros locales: `AccessSettings.jsx` declara expresamente que no habilitan login ni controles de acceso. `access.mjs` valida nombres y referencias, pero no autoriza operaciones.
- `server/ai.mjs` ofrece POST `/api/assistant`, escucha en loopback, admite un origen local fijo, obtiene la clave de entorno, limita cuerpo y pregunta y tiene timeout. Consulta Gemini con contexto suministrado por el cliente. No se verificó una respuesta real del proveedor ni disponibilidad del modelo configurado; no se leyeron secretos de `.env`.
- Respaldos JSON manuales. `validateImport` comprueba estructura básica y algunas referencias, sin validar exhaustivamente todos los campos, identidades y vínculos.
- Dinero y cantidades usan Number y redondeo. Stock se calcula recorriendo movimientos; las consultas derivadas vuelven a recorrer documentos/pagos. Conviene medir volumen antes de optimizar.
- Hay reglas de unicidad, stock, saldos y documentos confirmados. Persistencia local no garantiza concurrencia, aislamiento ni transacciones entre usuarios/pestañas.
- CSS incluye adaptación responsive; accesibilidad, móvil y flujos completos no fueron comprobados visualmente.
- Render configura alojamiento estático. No despliega el servidor de IA ni proporciona persistencia compartida.
- README quedó desactualizado respecto de edición de maestros, notas documentales y servidor Gemini; se debe reconciliar con la implementación.
- Git muestra los archivos de aplicación como no rastreados. No hay una base revisable de esos archivos registrada en el estado observado; no se crearon commits ni se alteró la rama.

## Validación ejecutada

`npm test`: 29 pruebas aprobadas, 0 fallidas. Registro íntegro en `work/replica-baseline-tests.txt`. Cubren dominio, Excel, libros y exportaciones; no prueban login, concurrencia, UI completa ni API Gemini.

`npm run build`: exitoso. Advertencias de directivas de Lucide y chunks mayores de 500 kB. La primera ejecución encontró EPERM del sandbox; al repetir con acceso ampliado ambas comprobaciones funcionaron. El build regeneró `dist`; no se modificó código fuente.

## Riesgos y siguiente validación

Priorizar persistencia transaccional y permisos de servidor antes del uso multiusuario. Revisar restauración íntegra, precisión monetaria, trazabilidad e idempotencia. Medir rendimiento y verificar UI mediante recorridos reales antes de afirmar calidad equivalente a Odoo. La revisión fiscal requiere requisitos concretos de la empresa.
