# Paso a paso

Lista de tareas en React Native y Expo. Permite añadir tareas con descripción,
marcarlas como completadas, filtrarlas y eliminarlas. Los datos se guardan en el dispositivo.

## Desarrollo

Requisitos: Node.js 20 o superior, npm y Expo Go para probar en un teléfono.

```bash
npm install
npm start
```

Escanea el QR con Expo Go. El teléfono y el ordenador deben estar en la misma red Wi-Fi.

Para ejecutar en un emulador Android:

```bash
npm run android
```

Para generar el proyecto nativo: `npx expo prebuild --platform android`.

## Estructura

- `src/components`: interfaz.
- `src/domain`: operaciones, filtros y progreso de las tareas.
- `src/hooks/use-tasks.ts`: estado, carga y guardado.
- `src/repositories`: contrato de persistencia y adaptador de almacenamiento.
- `src/composition`: configuración de AsyncStorage y generación de IDs.

El hook recibe sus dependencias; las reglas de tareas no dependen de React ni de AsyncStorage.
Se usa la clave `paso-a-paso.tasks` y se aceptan tareas antiguas sin descripción.

## Pruebas

```bash
npm run typecheck
npm test
```

Cubren las operaciones de tareas, el progreso, la persistencia y la compatibilidad de datos.
El código de prueba se compila en `.test-build`, excluido de Git.
