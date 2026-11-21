# Pyme 360 para Android

Contenedor Java anterior, conservado como referencia. La entrega vigente v1.5 se migró a Flutter en `mobile`; consultar `mobile/README.md`. La web también se llama Pyme 360.

Aplicación Android híbrida: interfaz React del ERP empaquetada dentro de la APK y contenedor Java nativo para conexión, archivos e impresión. La interfaz funciona sin descargar código de un sitio remoto. Los datos requieren conexión con la API existente; no hay modo de trabajo sin conexión ni sincronización diferida.

## Uso

1. Instalar la APK de pruebas en Android 8.0 o posterior, con Android System WebView actualizado. Para distribución final se requiere firmar una versión release con la clave de publicación de la empresa.
2. Abrir Pyme 360 e indicar el dominio HTTPS del ERP, por ejemplo `https://erp.tuempresa.com`, sin `/api/erp` al final. La app agrega esa ruta.
3. Ingresar empresa, usuario y contraseña creados desde Configuración → Usuarios de la web. La empresa local usa el identificador `empresa-local`.
4. El menú muestra los módulos permitidos: clientes/proveedores, inventario, ventas, compras, caja, impuestos y configuración. Los comandos y cálculos siguen ejecutándose en el servidor MySQL, con revisión e idempotencia.
5. **Actualizar** recarga los datos compartidos con la web; descarta formularios pendientes tras confirmación. **Servidor** permite cambiar de empresa/servidor y cierra la sesión actual. **Salir**, dentro del ERP, revoca la sesión.

La app conserva únicamente la dirección del servidor. No guarda contraseñas, tokens ni datos comerciales en archivos o preferencias. El token permanece en memoria nativa y no se entrega a JavaScript; se debe volver a ingresar después de cerrar/recrear la actividad (incluye rotar el teléfono). Las sesiones del servidor vencen a las ocho horas. Desactivar un usuario o cambiar su contraseña desde la web impide continuar con sus sesiones móviles.

La exportación de archivos abre el selector de destino de Android (límite de 20 MB por archivo), la importación abre el selector de documentos y la impresión usa el servicio de impresión/Guardar como PDF del teléfono. Estas operaciones requieren validación manual en un dispositivo real. Los recursos remotos de la WebView están bloqueados; imágenes por URL externa no se descargan. Las imágenes embebidas en los datos sí pueden mostrarse.

## Servidor

La app se conecta a `/api/erp` con `X-ERP-Client: mobile` y `Authorization: Bearer …`. Usa la API de autenticación existente y sus controles por empresa y módulo. No se conecta directamente a MySQL. No requiere CORS, ni ampliar la lista de orígenes web.

El servidor del repositorio sigue en `127.0.0.1:3002`. Para un teléfono real hace falta un proxy/alojamiento HTTPS con certificado confiable que publique `/api/erp` hacia esa API. Esta entrega no publica infraestructura, no abre puertos y no modifica el firewall. No usar `localhost` en el teléfono para referirse a la computadora.

Para pruebas en un emulador Android, la compilación debug permite **únicamente** `http://10.0.2.2:3002` como excepción HTTP. La release exige HTTPS. El servidor no sigue redirecciones y no se ignoran errores de certificados.

## Compilar

Herramientas: JDK 17 o 21, Gradle 8.11.1, Android SDK 35 y Build Tools 35.0.0. AGP 8.9.2. La combinación se basa en las [notas de AGP 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes). Se puede abrir esta carpeta directamente en Android Studio.

Desde la raíz del ERP, en PowerShell:

```powershell
npm ci
./android/build.ps1
```

El script usa las herramientas portables de `work/android-tools` si están disponibles, o `JAVA_HOME` / `ANDROID_HOME` del entorno. Ejecuta `npm run build:android` y Gradle. Los recursos se generan en `android/app/src/main/assets/web`, excluidos de Git. La web habitual conserva su nombre ERP Amigable.

Resultado debug: `android/app/build/outputs/apk/debug/app-debug.apk`.

Para preparar una release sin firma de publicación: `./android/build.ps1 -Release`. Configurar la firma de distribución en Android Studio antes de entregar a producción o publicar en una tienda; nunca guardar la clave de firma en el repositorio.

Verificación: `npm test`, `npm run build`, `npm run build:android` y Gradle `assembleDebug lintDebug`. El transporte tiene pruebas de respuestas fuera de orden, errores 401/409, tiempo máximo y fallas del puente nativo. La integración MySQL verifica el contrato móvil y revocación de sesiones en `tests/auth-integration.test.mjs`. Una compilación correcta no sustituye la prueba de instalación, conexión, archivos e impresión en un teléfono.
