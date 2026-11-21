# Unidad 2 — Autenticación local e integración

Implementación del Integrante 3 de «Paso a paso», sobre la aplicación de Unidad 1. Incluye registro, inicio y cierre de sesión, persistencia de sesión y separación de tareas por usuario. Funciona localmente con AsyncStorage y SecureStore, sin backend ni servicios web. Se integraron los contratos y dependencias de cámara, fotografías, permisos y GPS de `main`; sus implementaciones nativas y controles de interfaz todavía no están en este proyecto. El README conserva el informe histórico de Unidad 1.

## Ejecutar y comprobar

Se mantiene React Native 0.88.0, React 19.3, Expo SDK 58 y TypeScript. Las herramientas se verificaron con Node 24.11.0. Para instalar y ejecutar:

```bash
npm ci
npx expo start --clear
```

Abrir en Expo Go compatible con SDK 58 para Android/iOS. La autenticación web queda bloqueada si SecureStore no está disponible. Las pruebas automatizadas y el chequeo de tipos se ejecutan con:

```bash
npm run typecheck
npm test
```

## Estructura y responsabilidades

El aporte de autenticación conserva cinco archivos nuevos de código, dos de pruebas y este documento. Después de integrar los cinco archivos de contratos/tipos del compañero, hay 25 archivos en `src`. La corrección de integración no agregó archivos de producción ni dependencias.

| Archivo | Responsabilidad |
|---|---|
| `src/components/auth-screen.tsx` | Formulario compartido de registro/login, mensajes e indicador de carga. |
| `src/hooks/use-auth.ts` | Estado de React y servicios nativos; crea una sola instancia del servicio. |
| `src/domain/auth-service.ts` | Validaciones, cuentas, sesión, cola de operaciones y diagnóstico opcional de tiempos. |
| `src/domain/password.ts` | Derivación y verificación de credenciales actuales y antiguas. |
| `src/repositories/user-task-repository.ts` | Acceso por propietario y sesión de tareas, reutilizando el repositorio existente. |

`App.tsx` decide entre recuperación de sesión, formulario o pantalla de tareas. `useTasks` conserva la lógica de interfaz existente y recibe el repositorio de la cuenta. No se añadió navegación, Context ni Redux.

## Registro, acceso y sesión

El registro exige todos los campos, nombre de hasta 80 caracteres, correo válido de hasta 254 caracteres y contraseña de 8 a 128 caracteres con confirmación. Se normalizan nombre y correo; la contraseña conserva sus caracteres originales. Los correos duplicados se rechazan incluso con registros simultáneos, espacios y mayúsculas. Cada cuenta tiene un UUID de Expo Crypto.

La cola serializa las operaciones de cuentas. El registro lee una vez el índice, deriva una vez y guarda primero la credencial segura y luego el perfil público. Solo confirma cuando ambas escrituras terminan. Si falla el índice, intenta retirar la credencial recién creada y no publica la cuenta. Se vuelve al login con un mensaje de éxito.

El login lee el índice y la credencial, verifica una vez y espera la escritura de la sesión en SecureStore antes de publicar el usuario. Las credenciales incorrectas generan un mensaje genérico. Las contraseñas que superan el límite se rechazan antes de consultar almacenamiento o derivar.

Una credencial antigua puede necesitar una actualización. Después de verificarla y persistir la sesión, se permite mostrar inmediatamente la pantalla principal y se encola la migración opcional. Se conserva la misma cuenta y UUID. La migración no modifica tareas y las siguientes operaciones de cuentas esperan esa misma cola. Si falla, se conserva la credencial anterior y se reintenta en otro login. Si se interrumpe la app antes de migrar, la cuenta antigua sigue siendo válida.

La recuperación de sesión valida el identificador, el índice y la credencial segura sin derivar contraseñas. Las llamadas simultáneas a `restore()` comparten la operación en curso; no se mantiene una caché permanente de perfiles. Una sesión corrupta o sin cuenta/credencial válida se elimina. Los fallos de lectura permiten reintentar sin borrar datos.

Cerrar sesión espera las escrituras de tareas y la cola de cuentas, elimina solo la sesión segura y desmonta la pantalla protegida. Las tareas permanecen. Si falla el borrado de sesión, se conserva el estado autenticado para permitir reintentar. Atrás en Android vuelve de registro a login; tras salir no existe un historial que permita volver a tareas.

## Credenciales y dependencias

| Paquete existente | Uso |
|---|---|
| `expo-secure-store ~58.0.3` | Credenciales derivadas, clave local y sesión en el almacenamiento seguro nativo. |
| `expo-crypto ~58.0.8` | UUID y bytes aleatorios nativos. |
| `@noble/hashes ^2.4.0` | HMAC-SHA256, PBKDF2 asíncrono y compatibilidad con scrypt. |

Producción usa el formato existente `pbkdf2-device-v1`: HMAC-SHA256 con una clave aleatoria local de 256 bits, seguido de PBKDF2-SHA256 con 10.000 iteraciones, sal individual de 16 bytes y resultado de 32 bytes. Esta optimización conserva todos esos parámetros; cambia únicamente la ventana del planificador de 8 a 16 ms. Las conversiones a hexadecimal se usan para el almacenamiento de strings y se decodifican una sola vez al verificar.

La clave local se obtiene de SecureStore en cada operación y no se conserva en una caché de JavaScript. La verificación no recrea una clave ausente o dañada. Sal y obtención de clave se solicitan en paralelo porque son independientes. Los buffers temporales de clave, contraseña y resultado se limpian cuando es posible; esto no garantiza eliminar todas las copias en memoria administrada.

Se verifican credenciales antiguas scrypt con `N=32768, r=8, p=3` y PBKDF2-SHA256 con 600.000 iteraciones. El primer login de una cuenta antigua puede seguir siendo lento: es necesario comprobar su derivación original. La migración añade una derivación del formato nuevo, pero queda fuera de la confirmación de acceso. Una cuenta actual ejecuta solamente una derivación por registro o verificación.

El perfil local de 10.000 iteraciones fue heredado de la implementación anterior a esta auditoría y depende de la clave protegida por SecureStore. No equivale a la resistencia offline del scrypt anterior ni a los perfiles para contraseñas de servidores de [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Extraer tanto clave como credenciales permite intentos offline más baratos. No se redujeron más los parámetros para alcanzar una cifra de latencia.

Se revisó la API instalada de [Expo Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/) y no se sustituyó la derivación por un digest simple. No se agregaron módulos nativos que requieran salir de Expo Go. [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) se usa sin biometría ni fallback a AsyncStorage.

## Almacenamiento e integración de tareas

| Almacén | Clave | Contenido |
|---|---|---|
| AsyncStorage | `paso-a-paso.users.v1` | Índice de perfiles `{ id, name, email }`. |
| SecureStore | `paso-a-paso.credential.<UUID>` | Perfil asociado y credencial derivada. |
| SecureStore | `paso-a-paso.password-key.v1` | Clave aleatoria local para el formato actual. |
| SecureStore | `paso-a-paso.session.v1` | `{ version: 1, userId }`. |
| AsyncStorage | `paso-a-paso.tasks.user.<UUID>` | Tareas de la cuenta. |
| AsyncStorage | `paso-a-paso.tasks` | Respaldo original de Unidad 1, conservado. |
| AsyncStorage | `paso-a-paso.tasks.migration.v1` | Reserva de propietario y estado de importación. |

La pantalla principal se monta tras la confirmación de sesión y muestra los estados de carga existentes mientras `useTasks` obtiene las tareas. La revisión de tareas antiguas se ejecuta después de esa carga inicial. No se esperan tareas ni importación para confirmar el login.

El acceso por usuario reutiliza `createStorageTaskRepository`. Comprueba sesión y propietario; la composición captura la identidad concreta de la sesión para invalidar referencias antiguas incluso al volver a entrar con la misma cuenta. `createTaskSession` rechaza editar, completar o eliminar tareas ajenas y serializa escrituras antes de publicar el resultado. Una carga fallida bloquea modificaciones para evitar sobrescrituras. Al desmontar se descarta el estado de esa sesión, sin borrar tareas persistidas.

Se mantiene `TaskRepository.load(): Promise<Task[] | null>` y `save(tasks: readonly Task[]): Promise<void>`. `null` representa ausencia de datos y `[]` una lista guardada vacía. La lectura estricta rechaza datos corruptos en el adaptador de usuario; el repositorio conserva su comportamiento previo por defecto.

El modelo conserva `id`, `title`, `description`, `completed` y los campos opcionales `userId`, `imageUri`, `location`, `createdAt` y otros metadatos. Las tareas nuevas reciben propietario y fecha desde la sesión. Editar sin indicar imagen o ubicación conserva sus valores. `createdAt` es una cadena ISO 8601 en UTC; las tareas heredadas sin fecha permanecen sin fecha.

Los compañeros deben utilizar `addTask` y `updateTask` de `useTasks`; `TaskInput` admite imagen/ubicación pero no propietario ni fecha de creación. Los callbacks de periféricos deben cancelarse al desmontar. Las operaciones de sesiones cerradas y sobre IDs de otras cuentas se rechazan.

## Integración después de git pull y stash pop

Se revisaron los hooks, componentes, dominio, composición, repositorios, modelos y los cuatro contratos en `src/services`. No quedaron entradas sin resolver en el índice ni marcadores de conflicto en el código. Todo se mantiene local en `main`; no se modificó ni eliminó el stash original, ni se hicieron commits, push o ramas nuevas.

- **Fotografía:** la propiedad pública única es `imageUri`. `photoUri` se acepta como alias al leer JSON antiguo y en llamadas antiguas de dominio, pero no se persiste en las tareas normalizadas. Si las dos URI contienen valores diferentes, tiene prioridad `imageUri`; ambas referencias originales se conservan en el respaldo de metadatos. No se eliminan archivos de fotos.
- **Creación:** los números se interpretan como milisegundos desde Unix, no segundos. Las cadenas ISO con zona horaria se convierten a UTC mediante `toISOString()`. Se conserva el instante original y no se inventa una fecha para tareas que nunca la tuvieron.
- **GPS:** hay un único `TaskLocation` con latitud/longitud y los campos opcionales `accuracy`, `altitude`, `altitudeAccuracy`, `heading`, `speed`, `address` y `capturedAt`. `Coordinates` reutiliza ese modelo en lugar de duplicar campos. `capturedAt` permanece en milisegundos, como la API GPS, y no se reemplaza por la fecha de creación de la tarea.
- **Compatibilidad GPS:** se aceptan ubicaciones planas y objetos nativos `{ coords, timestamp }`; se conserva la precisión, altitud, dirección, velocidad, rumbo y los metadatos adicionales, y se obtiene `capturedAt` del `timestamp` original cuando hace falta.
- **Persistencia segura:** cargar normaliza en memoria sin escribir. Antes de reemplazar una representación antigua al guardar, el repositorio conserva los JSON originales bajo `<clave-de-tareas>.metadata-backup.v1`, como una lista de cadenas sin duplicados. El respaldo pertenece a la misma clave de usuario. Si guardar el respaldo falla o está corrupto, no se reemplazan las tareas. Los metadatos inválidos también bloquean la operación para proteger el original.
- **Propiedad:** imagen y ubicación se guardan dentro de la tarea bajo `paso-a-paso.tasks.user.<UUID>`. El formulario no puede cambiar su propietario ni `createdAt`. Las pruebas verifican dos cuentas con fotos/GPS distintos, rechazan modificaciones ajenas y comprueban que migrar una cuenta no modifica la otra.

La importación desde la clave global mantiene su confirmación y reserva de propietario y conserva el JSON global original. Los respaldos de metadatos no se muestran como tareas ni se importan a otra cuenta. Estos mecanismos conservan referencias a archivos, pero no sustituyen un respaldo externo de las fotografías.

**Límite encontrado en el código integrado:** `camera-service.ts`, `photo-storage.ts`, `permission-service.ts` y `location-service.ts` contienen interfaces, no implementaciones. No hay llamadas a ImagePicker, FileSystem o Location desde la interfaz y el formulario solo envía título/descripción. Se conservaron íntegramente esos contratos y las dependencias; no se inventaron capturas ni pruebas de permisos reales. La captura, copia durable de fotos y obtención nativa de GPS siguen pendientes de implementación. La integración de sus datos y el aislamiento por usuario sí están probados con fixtures.

Las tareas globales antiguas requieren una confirmación explícita de propiedad. Se reserva la cuenta con estado `pending`, se copia sin duplicar IDs y se marca `done`. Solo la cuenta reservada puede reintentar. El original permanece intacto, incluso si falla una escritura. Si falla únicamente el marcador final, se devuelven las tareas ya guardadas para evitar sobrescribirlas desde un estado anterior. La declaración de propiedad no permite demostrar quién creó originalmente esas tareas; una importación reintentada puede recuperar una tarea importada que se eliminó mientras la reserva seguía pendiente.

## Auditoría de rendimiento

El flujo revisado es botón → validación → almacenamiento/derivación → sesión confirmada → estado de React → pantalla principal → carga de tareas.

Los cuellos identificados fueron:

- La derivación criptográfica y sus cesiones al planificador dominan el tiempo de CPU. El formato actual ya derivaba una sola vez por operación; las validaciones no explican la demora.
- El registro volvía a leer el índice dentro de `addAccount`. Ahora utiliza la lectura validada de la misma operación serializada: pasa de dos lecturas a una.
- La migración de cuentas antiguas se esperaba antes de publicar el usuario. Ahora sucede después de persistir la sesión, dentro de la cola y sin bloquear la confirmación del acceso.
- El intervalo de cesión de 8 ms provocaba más temporizadores en la implementación instalada de noble. Se midieron ventanas de 8, 16 y 32 ms; se eligieron 16 ms para reducir el costo sin aumentar la ventana síncrona a 32 ms en cuentas actuales. No es una garantía de FPS en Hermes.
- Había un temporizador artificial antes de derivar formatos antiguos. Se retiró; las lecturas nativas previas y el planificador del algoritmo conservan las oportunidades de ceder al entorno.
- Cada lectura segura consultaba `isAvailableAsync()`. En la versión instalada esa función comprueba la existencia de la API: no hace una lectura de credenciales ni una llamada nativa costosa. Ahora se comparte solo esa comprobación de capacidad. No se le atribuye la mejora principal.
- Las llamadas simultáneas de restauración podían repetir lecturas; ahora comparten su promesa. No se cachean perfiles, credenciales ni claves.

Los servicios se construyen fuera del render y el repositorio de tareas mantiene su `useMemo` por usuario. El proyecto no envuelve explícitamente la raíz con StrictMode; de todos modos se mantiene la limpieza de efectos y se prueba la restauración concurrente. [React documenta](https://react.dev/reference/react/StrictMode) que en desarrollo los efectos pueden repetir montaje y limpieza bajo StrictMode. No se retiraron protecciones ni se agregó memoización generalizada.

## Mediciones realizadas

Todas las cifras siguientes se obtuvieron en Windows con Node 24.11.0, la derivación real de noble y almacenamiento en memoria. **No son mediciones de Expo Go, Hermes ni SecureStore nativo.** No incluyen renderizado o dibujo físico de pantalla.

Se conservaron temporalmente copias compiladas de la versión previa y se compararon con la optimizada en un mismo proceso, alternando el orden. Cada ronda descartó cinco calentamientos por versión y tomó 20 muestras por versión, con diagnóstico desactivado. Cada registro creó un almacén nuevo; el login comprobó esa misma cuenta actual. Se realizaron dos rondas:

| Ronda | Registro anterior | Registro optimizado | Login anterior | Login optimizado |
|---|---:|---:|---:|---:|
| 1, mediana en ms | 56,29 | 35,74 | 57,35 | 35,41 |
| 2, mediana en ms | 94,11 | 76,72 | 92,94 | 65,83 |

La segunda ronda reduce aproximadamente un 18 % el registro y un 29 % el login en ese entorno. La diferencia entre rondas muestra la variabilidad del computador y del planificador; no permite prometer una latencia móvil. En ambas se comprobó una lectura de usuarios por registro optimizado y una derivación por operación actual.

Una captura separada de diagnóstico, con diez muestras tras cinco calentamientos, midió las etapas de la versión actual. Las líneas de diagnóstico se recogieron en memoria para no imprimir durante el cálculo. Estas cifras no se deben mezclar con la comparación anterior ni sumar: hay etapas anidadas y trabajo en paralelo.

| Etapa | Registro, mediana ms | Login, mediana ms |
|---|---:|---:|
| Validación | 0,01 | 0,01 |
| Lectura de usuarios, almacenamiento en memoria | <0,01 | <0,01 |
| Lectura de credencial, almacenamiento en memoria | No corresponde | 0,01 |
| Obtención completa de clave local | 0,11 | 0,02 |
| Generación de UUID | 0,01 | No corresponde |
| Generación de sal | 0,08 | No corresponde |
| Generación de clave local, primer registro | 0,02 | No corresponde |
| Derivación PBKDF2 actual | 38,35 | 33,89 |
| Hash completo / verificación completa | 38,65 | 34,01 |
| Escritura de credencial, almacenamiento en memoria | 0,02 | No corresponde |
| Escritura de usuarios, almacenamiento en memoria | 0,01 | No corresponde |
| Persistencia de sesión, almacenamiento en memoria | No corresponde | 0,02 |
| Servicio completo | 38,79 | 34,12 |
| Carga inicial de tareas, repositorio con almacenamiento en memoria | No corresponde | 0,03 |
| Estado de React y montaje de pantalla | Pendiente en dispositivo | Pendiente en dispositivo |

La validación se conserva en TypeScript y se comparó la derivación con `node:crypto`. La evaluación no reemplaza una medición nativa. El objetivo de menos de 500 ms por operación actual e idealmente menos de un segundo hasta la pantalla principal sigue pendiente de comprobar en un teléfono de gama media.

## Diagnóstico en Expo Go

El mecanismo temporal está en los archivos existentes, desactivado por defecto y limitado a desarrollo. Para activarlo en PowerShell:

```powershell
$env:EXPO_PUBLIC_AUTH_DIAGNOSTICS = '1'
npx expo start --clear
```

1. Abrir el proyecto en Expo Go y consultar la consola de React Native DevTools. Filtrar por `[auth-perf]`. La línea `inicio` identifica el motor; comprobar que indique `Hermes` para medir ese entorno.
2. Crear una cuenta nueva y entrar con ella. Repetir login/logout con una cuenta actual al menos diez veces; separar el primer arranque y los logins de cuentas antiguas del resto de muestras.
3. Agrupar por `id` y `operation`. Las líneas `kind: duracion` contienen tiempo de esa etapa, `ok` y desplazamiento desde el inicio. `servicio_total` incluye la cola y las escrituras críticas del servicio.
4. Las marcas `kind: desde_inicio` indican tiempo desde que el hook recibe la acción. `indicador_carga_montado` corresponde al efecto posterior al commit del indicador; `estado_auth_solicitado` y `estado_auth_confirmado` permiten observar la transición de estado. `formulario_listo` marca el regreso al formulario después del registro.
5. Para el flujo completo de login observar `pantalla_principal_montada` y después `tareas_mostradas`. `tareas_carga_inicial` mide la lectura y preparación inicial; `tareas_antiguas_revision` sucede por separado. No sumar estas marcas, porque ya son tiempos acumulados.
6. Las marcas de React se toman desde efectos posteriores al commit. No equivalen a una medición del primer píxel dibujado ni a un perfil de FPS. La consola también añade costo; desactivar el diagnóstico al terminar.
7. Repetir registro/login/CRUD/logout sin conexión externa con el bundle ya cargado. Durante desarrollo el acceso a Metro por la red local puede seguir siendo necesario para cargar el bundle.

Los eventos contienen únicamente un número de ejecución, motor, operación, etiquetas constantes, estado de éxito y tiempos. No registran perfiles, correos, UUID de usuarios, tareas, contraseñas, sales, hashes, claves ni errores técnicos. Los eventos anidados capturan su ejecución al empezar; conviene completar cada medición antes de lanzar otra acción, especialmente durante la migración de una cuenta antigua.

Para desactivar y volver al funcionamiento habitual:

```powershell
$env:EXPO_PUBLIC_AUTH_DIAGNOSTICS = '0'
npx expo start --clear
```

## Verificación y límites pendientes

| Comprobación | Evidencia |
|---|---|
| TypeScript | `npm run typecheck` aprobado. |
| Pruebas | 64 aprobadas: las 52 previas a la integración y 12 adicionales de fotos, fechas, GPS, respaldos e aislamiento. |
| Autenticación y sesión | Registro, validaciones, duplicados concurrentes, login correcto/incorrecto, reinicio, restauración concurrente y logout. |
| Escrituras críticas | Registro pendiente hasta publicar el índice; reversión de credencial si falla; login pendiente hasta guardar sesión. |
| Migración | Compatibilidad PBKDF2/scrypt, contraseña incorrecta sin cambios, reintentos, acceso sin esperar migración opcional y cierre serializado. |
| Operaciones redundantes | Una lectura del índice en registro, un hash o verificación por operación actual y ninguna derivación durante restauración. |
| Aislamiento y persistencia | A → B → A, tareas ajenas rechazadas, escrituras fallidas, operaciones rápidas, callbacks tardíos y respaldo de Unidad 1. |
| Imagen y ubicación | Alias de fotografía, fechas numéricas/ISO, GPS plano/nativo y todos sus metadatos; conservación al editar, completar, importar y recargar; rechazo de cambios entre cuentas. |
| Diagnóstico | Silencioso cuando está desactivado; eventos por etapas sin datos privados cuando está activado. |
| Sin red | Registro, login, restauración y logout con `fetch` bloqueado y cero llamadas. Prueba de dominio con almacenes en memoria. |
| Android/iOS | Empaquetado JavaScript mediante Expo export; no equivale a compilación nativa ni prueba en teléfono. |
| Dispositivo | `adb devices -l` no encontró dispositivos conectados. Los tiempos nativos, teclado, botón Atrás, SecureStore real y fluidez siguen pendientes. |

La exportación de verificación usa `EXPO_OFFLINE=1` y `EXPO_NO_TELEMETRY=1`:

```bash
npx expo export --platform android --platform ios --output-dir .test-build/expo --no-bytecode --max-workers 1
```

Esta autenticación es académica y local. No verifica correos, no recupera contraseñas, no sincroniza dispositivos y no tiene revocación remota ni límite persistente de intentos. SecureStore protege sus valores mediante el sistema operativo; AsyncStorage no cifra perfiles, tareas ni referencias a imágenes/ubicación. La separación por usuario no protege un dispositivo comprometido o la manipulación directa de sus archivos.

La clave local debe conservarse junto con las cuentas: perderla impide verificar las que usan el formato actual. Borrar datos o desinstalar la app/Expo Go puede perder cuentas y tareas. La comparación de hashes recorre todos sus bytes, pero JavaScript no garantiza tiempo constante ni eliminación completa de secretos de la memoria. No se añaden respaldos externos ni garantías de seguridad de producción.

## Archivos modificados en esta auditoría

`App.tsx`, `src/domain/auth-service.ts`, `src/domain/password.ts`, `src/hooks/use-auth.ts`, `src/components/auth-screen.tsx`, `src/hooks/use-tasks.ts`, `tests/auth.test.ts`, `README.md` y este documento. Se revisaron el repositorio por usuario, la composición, el modelo y las pruebas de tareas; se conservaron sus contratos. `package.json` y las dependencias no necesitaron cambios.

En la revisión posterior a la integración se modificaron `src/types/task.ts`, `src/domain/task-operations.ts`, `src/repositories/storage-task-repository.ts`, `src/services/location-service.ts`, los tres archivos de pruebas de tareas, `README.md` y este informe. Se conservaron los cambios ya integrados del compañero y no se modificó el diseño visual.
