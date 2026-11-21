# Pyme 360 v1.5 — Flutter Android

Migración del contenedor móvil a Flutter. Conserva los módulos React empaquetados como recursos locales; no es una reescritura de cada formulario en widgets Dart. La selección de servidor y navegación exterior usan Flutter, la conexión HTTPS y la sesión móvil usan Dart. La WebView nunca recibe el token. Impresión y exportación usan un canal Android; la importación abre el selector del dispositivo.

## Compilar

Flutter estable 3.50.1, JDK 17/21 y Android SDK. Desde la raíz: `npm ci`, `npm run build:flutter`; desde `mobile`: `flutter pub get`, `flutter analyze`, `flutter test` y `flutter build apk --debug`. `build.ps1` automatiza el proceso con el SDK portable de `work/flutter-sdk` si está instalado.

Resultado: `mobile/build/app/outputs/flutter-apk/app-debug.apk`. Copia de entrega en `output/Pyme360-1.5.0-flutter-pruebas.apk`. La APK debug es de pruebas; la tienda requiere firma release de la empresa. No subir claves al repositorio. Recursos generados, SDK y cachés no se incluyen en Git.

## Usar

Instalar en Android 8.0 o superior. Indicar el dominio HTTPS de la API móvil Railway, sin `/api/erp`. Ingresar empresa, usuario y contraseña del ERP web. Todos los módulos usan la misma base y permisos. El transporte exige certificados válidos y no sigue redirecciones. Solo persiste la dirección del servidor; el token permanece en memoria Dart y se borra al salir o cambiar de servidor. La sesión del servidor vence a las ocho horas. Cambiar contraseña/desactivar usuario revoca el acceso.

Actualizar descarta formularios después de confirmar. Cambiar servidor intenta revocar la sesión antes de eliminarla; sin red vence en servidor. No hay trabajo sin conexión ni sincronización diferida. La app no abre MySQL directamente ni copia datos hacia la PC.

Los recursos React se sirven por un puerto aleatorio de loopback interno a la app; la única conexión comercial es HTTPS desde Dart hacia Railway. Android permite HTTP únicamente a 127.0.0.1 para cargar esos recursos locales. No se admiten servidores ERP HTTP. WebView bloquea navegación exterior y CSP restringe recursos remotos.

Las pruebas automáticas verifican sesión, validación de dominio y token; deben completarse con instalación, conexión, archivos e impresión en dispositivo real y con la API desplegada.
