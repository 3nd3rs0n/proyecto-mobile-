# Paso a paso — Lista de tareas

Aplicación móvil de demostración creada con React Native y Expo. Permite añadir tareas, marcarlas como completadas, filtrarlas y eliminarlas. Las tareas se guardan en el dispositivo.

## Requisitos

- Node.js 20 o superior
- npm
- Expo Go en el teléfono para probar la app

## Ejecutar en el teléfono

Desde esta carpeta, instala las dependencias e inicia Expo:

```bash
npm install
npm start
```

Escanea el código QR que aparece en la terminal con Expo Go. El ordenador y el teléfono deben estar conectados a la misma red Wi-Fi.

## Ejecutar en Android

Con un emulador Android abierto, ejecuta:

```bash
npm run android
```

Para generar o reconstruir el proyecto nativo de Android, usa `npx expo prebuild --platform android`. La app guarda la lista localmente y no necesita configurar un servidor o una base de datos.
