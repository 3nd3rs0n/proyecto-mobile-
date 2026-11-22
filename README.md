# Paso a paso — Lista de tareas en React Native

Proyecto académico desarrollado por tres integrantes. La To-Do List de la Unidad 1 evolucionó en la Unidad 2 para incorporar fotografías, ubicación, permisos, almacenamiento local y cuentas de usuario, conservando la gestión de tareas existente.

Consulta la [entrega de Unidad 2](#unidad-2--entrega-final) y el [informe original de Unidad 1](#informe-original-de-la-unidad-1).

**Evaluaciones Unidades 1 y 2 · Desarrollo de Aplicaciones Móviles · Instituto Profesional San Sebastián**

| Dato | Detalle |
|---|---|
| **Institución** | Instituto Profesional San Sebastián |
| **Asignatura** | Desarrollo de Aplicaciones Móviles |
| **Docente** | Boris Belmar |
| **Integrantes** | Enderson Torres ([@3nd3rs0n](https://github.com/3nd3rs0n)) · Ezequiel Tobar ([@ezequieltobar](https://github.com/ezequieltobar)) · Diego Rivera ([@D3R5](https://github.com/D3R5)) |
| **Tecnología** | React Native 0.88 · Expo SDK 58 · TypeScript |
| **Repositorio** | https://github.com/3nd3rs0n/proyecto-mobile- |

Aplicación móvil para registrar y visualizar una lista de tareas pendientes. Cada tarea tiene **título y descripción**, y se puede **agregar, editar, completar y eliminar**. Además permite filtrar las tareas, ver el progreso y guarda la lista en el dispositivo.

<p align="center">
  <img src="docs/capturas/01-tarea-con-descripcion.jpg" width="230" alt="Tarea con título y descripción">
  &nbsp;
  <img src="docs/capturas/06-editar-formulario.jpg" width="230" alt="Editando una tarea">
  &nbsp;
  <img src="docs/capturas/04-filtro-pendientes.jpg" width="230" alt="Filtro de pendientes">
</p>

---

## Unidad 2 — Entrega final

La evaluación se centra en las **APIs internas del dispositivo y las funcionalidades locales**. La aplicación utiliza cámara, GPS, permisos y archivos del teléfono; no incorpora un backend ni consume APIs externas o servicios web como parte de la evaluación.

### Integrante 1 — Periféricos del dispositivo

- Implementó la captura con cámara y la selección desde la galería, con vista previa y asociación de la fotografía a la tarea.
- Integró GPS para registrar coordenadas, precisión y momento de captura. La tarea muestra la dirección cuando está disponible o las coordenadas, con acceso a la aplicación de mapas del dispositivo.
- Gestionó permisos de cámara y ubicación, cancelaciones, permisos bloqueados y acceso a Ajustes. Ante demora o error del GPS, se utiliza la última ubicación conocida si es reciente; si falla la dirección, se conservan las coordenadas.
- Incorporó pruebas automatizadas de cámara, permisos, ubicación y mensajes de error mediante simulaciones de las APIs nativas.

### Integrante 2 — Almacenamiento local

- Implementó la persistencia y recuperación de tareas mediante AsyncStorage, incluyendo título, descripción, estado, referencia de fotografía y ubicación asociada.
- Guardó las fotografías en la carpeta de documentos de la aplicación con FileSystem, conservando su referencia como `imageUri` en la tarea. Se gestionó la limpieza de fotografías nuevas descartadas, reemplazadas y de tareas eliminadas.
- Conservó la edición, eliminación, cambio de estado, filtros y progreso. Los cambios se confirman después de guardarse y los errores no limpian el formulario antes de tiempo.
- Incorporó pruebas de almacenamiento, copia de fotografías, datos antiguos, respaldos, metadatos GPS y fallos de lectura/escritura.

Una vez cargada la app, las cuentas, las tareas y las fotografías guardadas se gestionan localmente sin conexión a Internet. La carga del proyecto en Expo Go requiere acceso al servidor Metro; la obtención de una dirección legible y la apertura de mapas dependen de los servicios disponibles en el teléfono.

### Integrante 3 — Autenticación e integración

- Implementó registro con validaciones, inicio y cierre de sesión, rechazo de correos duplicados y botones para mostrar u ocultar las contraseñas.
- Persistió la sesión y las credenciales derivadas en SecureStore; las contraseñas no se guardan en texto plano. La sesión se recupera al abrir la app y las tareas se conservan al cerrarla.
- Separó las tareas por usuario y bloqueó operaciones sobre tareas de otra cuenta o de una sesión cerrada.
- Integró formulario, periféricos y persistencia con un modelo común: `imageUri`, `createdAt` en ISO UTC y `TaskLocation`. Conservó compatibilidad con `photoUri` y fechas numéricas antiguas, con respaldo previo a su normalización. La importación de tareas de Unidad 1 requiere confirmación de propiedad.
- Incorporó pruebas generales de autenticación, recuperación de sesión, cambio de usuario, aislamiento, integración de fotos/GPS y manejo de errores.

### Tecnologías y dependencias utilizadas

| Tecnología o dependencia | Uso en el proyecto |
|---|---|
| React Native 0.88, React 19.3, Expo SDK 58 y TypeScript 6 | Aplicación móvil y comprobación de tipos. |
| `expo-image-picker` | Cámara y selección de fotografías. |
| `expo-location` | Permisos, GPS y resolución de direcciones del sistema. |
| `expo-file-system` | Copia y eliminación de archivos locales de fotografías. |
| `@react-native-async-storage/async-storage` | Perfiles públicos, tareas y metadatos persistidos. |
| `expo-secure-store` | Credenciales derivadas, clave local y sesión. |
| `expo-crypto` y `@noble/hashes` | UUID, aleatoriedad y derivación/verificación de contraseñas. |
| `react-native-safe-area-context` y `expo-status-bar` | Área segura y barra de estado de la interfaz. |
| `node:test` y `node:assert` | Pruebas automatizadas, sin agregar un framework de pruebas. |

Las versiones declaradas se encuentran en `package.json`. La autenticación está orientada a Expo Go en Android/iOS y requiere SecureStore; no se ofrece ese flujo en la versión web.

### Instalación, ejecución y pruebas

Las instrucciones y comandos actualizados están en [Cómo ejecutar la app](#2-cómo-ejecutar-la-app). La suite actual se organiza así:

| Archivos de pruebas | Cobertura |
|---|---|
| `camera-service.test.ts`, `permission-service.test.ts`, `location-service.test.ts`, `device-notice.test.ts` | Captura, cancelaciones, permisos, GPS, coordenadas, direcciones y avisos. |
| `attachments.test.ts` | Copia de imágenes a almacenamiento permanente y errores de archivos. |
| `task-domain.test.ts`, `task-repository.test.ts` | Operaciones de tareas, persistencia, normalización de datos y respaldos. |
| `auth.test.ts`, `user-tasks.test.ts` | Cuentas, sesión, aislamiento por usuario e integración con fotografías y ubicaciones. |

Todos están en `tests/`. Las pruebas automatizadas usan almacenamiento y periféricos simulados; no sustituyen la comprobación física de cámara, permisos y GPS en Expo Go. Esta actualización documental no atribuye nuevos resultados de ejecución a la suite.

Para la comprobación en teléfono: crear dos cuentas, adjuntar una foto y ubicación a una tarea, editarla, reiniciar la app, cambiar de usuario y comprobar que cada cuenta conserve sus datos. Probar también cancelar la captura, denegar permisos y gestionar tareas guardadas sin conexión externa.

### Estado final de implementación

- [x] Cámara, galería, fotografías asociadas y gestión de permisos integradas en el formulario.
- [x] Registro y visualización de ubicación GPS en las tareas.
- [x] Persistencia local de tareas, fotografías y ubicaciones.
- [x] Edición, eliminación, estado, filtros y progreso conservados desde Unidad 1.
- [x] Registro, inicio/cierre de sesión y recuperación de sesión implementados.
- [x] Datos separados por usuario y compatibilidad con tareas antiguas.
- [x] Pruebas automatizadas de periféricos, almacenamiento y autenticación incluidas.
- [x] Evaluación enfocada en el dispositivo y los datos locales, sin backend ni APIs externas propias.

---

## Capturas de pantalla — Unidad 2

### Periféricos del dispositivo

<table>
  <tr>
    <th>Permiso de cámara</th>
    <th>Permiso de ubicación</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/capturas/eva2/08-permiso-camara.jpeg" width="220" alt="Solicitud de permiso para usar la cámara en Expo Go"></td>
    <td align="center"><img src="docs/capturas/eva2/10-permiso-ubicacion.jpeg" width="220" alt="Solicitud de acceso a la ubicación mientras se usa la aplicación"></td>
  </tr>
  <tr>
    <th>Cámara bloqueada: acceso a Ajustes</th>
    <th>Ubicación bloqueada: acceso a Ajustes</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/capturas/eva2/11-camara-bloqueada.jpeg" width="220" alt="Aviso de permiso de cámara bloqueado con botón Abrir Ajustes"></td>
    <td align="center"><img src="docs/capturas/eva2/12-ubicacion-bloqueada.jpeg" width="220" alt="Aviso de permiso de ubicación bloqueado con botón Abrir Ajustes"></td>
  </tr>
</table>

### Almacenamiento local

**Edición de una tarea con fotografía y ubicación asociadas.** La captura muestra el formulario y sus datos adjuntos; no representa por sí sola una prueba de recuperación tras reiniciar.

<p align="center">
  <img src="docs/capturas/eva2/09-foto-y-ubicacion.jpeg" width="220" alt="Formulario de edición de una tarea con fotografía, ubicación y botón Guardar">
</p>

### Autenticación e integración

<table>
  <tr>
    <th>Inicio de sesión</th>
    <th>Registro de usuario</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/eva2/13-inicio-de-sesion.jfif" width="220" alt="Formulario de inicio de sesión con control para mostrar u ocultar la contraseña"></td>
    <td align="center"><img src="docs/eva2/14-crear-cuenta.jfif" width="220" alt="Registro con nombre, correo, contraseña y confirmación"></td>
  </tr>
  <tr>
    <th>Validación de inicio de sesión</th>
    <th>Validación de registro</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/eva2/15-inicio-de-sesion-fallido-o-error.jfif" width="220" alt="Mensaje Completa el correo y la contraseña al enviar el inicio de sesión vacío"></td>
    <td align="center"><img src="docs/eva2/16-crear-cuenta-fallida-o-error.jfif" width="220" alt="Mensaje Completa todos los campos al enviar el registro vacío"></td>
  </tr>
</table>

---

## Informe original de la Unidad 1

Se conserva el desarrollo original, su arquitectura, integrantes y capturas. Las 18 pruebas y los resultados manuales de las secciones siguientes corresponden a esa entrega; las instrucciones de ejecución se actualizaron para la aplicación actual.

## Índice del informe de Unidad 1

1. [Por qué React Native](#1-por-qué-react-native)
2. [Cómo ejecutar la app](#2-cómo-ejecutar-la-app)
3. [Requisitos del enunciado](#3-requisitos-del-enunciado)
4. [Arquitectura y estructura del proyecto](#4-arquitectura-y-estructura-del-proyecto)
5. [Conceptos fundamentales de React Native](#5-conceptos-fundamentales-de-react-native)
6. [Patrones de diseño aplicados](#6-patrones-de-diseño-aplicados)
7. [Componentes de interfaz](#7-componentes-de-interfaz)
8. [Diseño de la interfaz y usabilidad](#8-diseño-de-la-interfaz-y-usabilidad)
9. [Pruebas](#9-pruebas)
10. [Capturas de pantalla](#10-capturas-de-pantalla)
11. [Trabajo en equipo](#11-trabajo-en-equipo)
12. [Uso de agentes de IA](#12-uso-de-agentes-de-ia)
13. [Cierre de la Unidad 1](#13-cierre-de-la-unidad-1)

---

## 1. Por qué React Native

El enunciado propone Ionic, pero el docente autorizó cualquier framework, siempre que se justifique la elección. Elegimos **React Native con Expo y TypeScript**.

**React Native**
- **Demanda laboral.** Es uno de los frameworks móviles multiplataforma más usados en la industria y tiene más ofertas de trabajo que Ionic. Por esa misma razón el docente lo está usando en clases.
- **Componentes nativos reales.** Ionic dibuja la interfaz con HTML dentro de un *WebView*. React Native, en cambio, convierte `View`, `Text` o `TextInput` en vistas nativas de Android e iOS, así que la app se ve y se comporta como una app nativa.
- **Un solo código** para Android, iOS y web.

**Expo**
- No hace falta configurar código nativo ni Gradle para empezar.
- Con **Expo Go** se prueba la app al instante en un teléfono físico, escaneando un código QR. Así la probamos en un iPhone.
- Es la forma de crear proyectos que recomienda la documentación oficial de React Native.

**TypeScript**
- Detecta errores antes de ejecutar la app. El tipo `Task` funciona como contrato entre la interfaz, la lógica y el almacenamiento: si alguien escribe `titulo` en vez de `title`, el editor lo marca de inmediato.

> **Sobre `localhost:8100`:** ese puerto es el que usa el servidor de desarrollo de Ionic. Expo trabaja distinto: la app se abre en el teléfono escaneando el código QR, o en el emulador de Android Studio. Por eso ese punto del enunciado no aplica a nuestra tecnología.

---

## 2. Cómo ejecutar la app

**Requisitos:** Node.js 22.12 o superior, npm y Expo Go compatible con SDK 58 en Android/iOS. El desarrollo se ha realizado con Node 24.11.0.

```bash
npm ci
npm start
```

- **Teléfono físico:** conectar teléfono y computador a la misma red Wi-Fi y abrir el QR con Expo Go en Android o la cámara en iOS. Autorizar cámara y ubicación cuando se soliciten.
- **Emulador Android:** abrir el emulador con Expo Go instalado y presionar `a` en la terminal de Expo. Para comprobar cámara y GPS se recomienda un teléfono físico.
- **Recargar sin caché:** ejecutar `npx expo start --clear` si Metro conserva una versión anterior.

`npm run android` y `npm run ios` son alternativas para compilar proyectos nativos; no son necesarias para usar Expo Go.

**Revisar tipos y ejecutar las pruebas:**

```bash
npm run typecheck
npm test
```

---

## 3. Requisitos del enunciado

| Requisito | Estado | Dónde está |
|---|---|---|
| Cada tarea tiene título y descripción | ✅ | `src/types/task.ts` |
| Página principal con la lista de tareas | ✅ | `App.tsx`, `TaskList`, `TaskItem` |
| Formulario para ingresar tareas | ✅ | `TaskForm` |
| Agregar una tarea | ✅ | `createTask()` en `src/domain/task-operations.ts` |
| Limpiar los campos después de agregar | ✅ | `TaskForm` |
| **Editar** una tarea | ✅ | `updateTask()` + modo edición de `TaskForm` |
| Botón eliminar junto a cada tarea | ✅ | `TaskItem` |
| Eliminar una tarea específica | ✅ | `deleteTask()` filtra por `id` |
| **Extra:** marcar como completada, filtros y progreso | ✅ | `toggleTask()`, `task-selectors.ts` |
| **Extra:** guardar en el dispositivo | ✅ | `src/repositories/` (AsyncStorage) |

El enunciado deja el almacenamiento local para las próximas unidades; ya está implementado.

---

## 4. Arquitectura y estructura del proyecto

```
App.tsx                               Pantalla principal: une la lógica con la interfaz
src/
├── components/                       INTERFAZ (solo dibujan y avisan eventos)
│   ├── app-header.tsx                Marca, fecha y mensaje principal
│   ├── progress-card.tsx             Progreso de tareas completadas
│   ├── task-form.tsx                 Formulario para añadir y editar
│   ├── filter-bar.tsx                Filtros Todas / Pendientes / Hechas
│   ├── task-list.tsx                 Lista y mensaje cuando está vacía
│   └── task-item.tsx                 Una tarea con completar, editar y eliminar
├── hooks/use-tasks.ts                ESTADO: conecta React con el dominio y el repositorio
├── domain/                           REGLAS (funciones puras, sin React ni AsyncStorage)
│   ├── task-operations.ts            Crear, editar, completar, eliminar, limpiar
│   └── task-selectors.ts             Filtros y resumen de progreso
├── repositories/                     ALMACENAMIENTO
│   ├── task-repository.ts            Contrato: load() y save()
│   └── storage-task-repository.ts    Implementación con almacenamiento clave-valor
├── composition/task-dependencies.ts  Configura AsyncStorage y la generación de ids
├── constants/                        Tema visual y tareas de ejemplo
└── types/task.ts                     Modelo de datos
tests/                                Pruebas automáticas del dominio y del repositorio
docs/capturas/                        Capturas usadas en este informe
```

### Capas y flujo de datos

```
        ┌───────────────────────── App.tsx ─────────────────────────┐
        │  AppHeader · ProgressCard · TaskForm · FilterBar · TaskList │  ← components (UI)
        └───────────────▲──────────────────────────────┬────────────┘
                 datos  │ (props)            eventos   │ (onSubmit, onEdit, onDelete…)
                        │                              ▼
                 ┌──────┴──────────── useTasks() ────────────────┐                ← hook (estado)
                 └──────┬──────────────────────────────┬─────────┘
                        ▼                              ▼
              domain/ (funciones puras)      TaskRepository (load / save)      ← reglas | almacenamiento
                                                       ▼
                                                  AsyncStorage
```

- **Los datos bajan** como props: las tareas, el progreso y la tarea en edición.
- **Los eventos suben** como funciones: `onSubmit`, `onEdit`, `onToggle` y `onDelete`.
- **Las reglas no dependen de React ni de AsyncStorage**, así que se pueden probar solas.

---

## 5. Conceptos fundamentales de React Native

| Concepto | Qué es | Ejemplo en el proyecto |
|---|---|---|
| **Componente** | Función que recibe datos y devuelve interfaz. | `TaskItem` dibuja una tarea. |
| **JSX** | Sintaxis parecida a HTML para describir la interfaz. | `<Text style={styles.title}>{task.title}</Text>` |
| **Props** | Datos que un componente padre entrega a un hijo; son de solo lectura. | `TaskItem` recibe `task`, `onEdit` y `onDelete`. |
| **Estado (`useState`)** | Datos que cambian; al cambiar, React vuelve a dibujar. | Lista de tareas en `useTasks`, texto del formulario en `TaskForm`. |
| **Efecto (`useEffect`)** | Código que se ejecuta cuando cambia un valor. | Cargar y guardar en AsyncStorage; llenar el formulario al editar. |
| **Hook personalizado** | Función que agrupa estado y lógica reutilizable. | `useTasks()` |
| **`ref` (`useRef`)** | Acceso directo a un elemento nativo. | Mover el cursor al título, hacer scroll hasta el formulario. |
| **Componentes nativos** | `View`, `Text`, `TextInput` y `Pressable` se convierten en vistas nativas. | Todos los componentes usan solo primitivas de React Native. |
| **StyleSheet y Flexbox** | Estilos en objetos de JavaScript; el diseño usa Flexbox. | `StyleSheet.create({...})` al final de cada componente. |
| **Inmutabilidad** | El estado no se modifica: se crea una copia nueva. | `map` para editar y completar, `filter` para eliminar. |
| **Keys en listas** | Identificador único para que React sepa qué elemento cambió. | `key={task.id}` en `TaskList`. |

**Arquitectura del framework.** El código TypeScript/JSX lo empaqueta **Metro** y lo ejecuta el motor de JavaScript del teléfono. React calcula qué cambió en la interfaz y React Native actualiza solo esas vistas nativas. Con **Fast Refresh**, cada cambio se ve en el teléfono al guardar el archivo.

---

## 6. Patrones de diseño aplicados

### 6.1 Arquitectura por capas
Cada carpeta tiene una responsabilidad: `components` dibuja, `hooks` maneja el estado, `domain` define las reglas y `repositories` guarda los datos. Para cambiar cómo se ve una tarea se toca un solo componente; para cambiar dónde se guarda, solo el repositorio.

### 6.2 Repositorio (*Repository*)
La app no usa AsyncStorage directamente: depende de un **contrato**.

```ts
export interface TaskRepository {
  load(): Promise<Task[] | null>;
  save(tasks: readonly Task[]): Promise<void>;
}
```

Este contrato permite mantener las reglas de tareas independientes de la implementación del almacenamiento local.

### 6.3 Inyección de dependencias y raíz de composición
`useTasks` **recibe** el repositorio y el generador de ids en vez de crearlos. Se configuran en un solo lugar, `src/composition/task-dependencies.ts`:

```ts
useTasks(taskRepository, createTaskId);
```

Gracias a esto, las pruebas pueden usar un almacenamiento falso en memoria.

### 6.4 Funciones puras e inmutables
Las reglas en `src/domain` reciben una lista y devuelven una **nueva**, sin modificar la original:

```ts
export function updateTask(tasks: readonly Task[], id: string, { title, description }: TaskInput): Task[] {
  const cleanTitle = title.trim();
  if (!cleanTitle) return [...tasks];
  return tasks.map((task) =>
    task.id === id ? { ...task, title: cleanTitle, description: description.trim() } : task,
  );
}
```

### 6.5 Hook personalizado
`useTasks()` reúne el estado, la carga y el guardado, y entrega al componente solo lo que necesita: `tasks`, `addTask`, `updateTask`, `deleteTask`, etc.

### 6.6 Componentes presentacionales y contenedor
Los componentes de `src/components` **no saben cómo se guardan las tareas**: reciben datos y avisan eventos. `App.tsx` es el **contenedor** que los conecta con el hook.

### 6.7 Componentes controlados
El valor de cada campo sale del estado. Por eso **limpiar el formulario** o **llenarlo al editar** es solo cambiar ese estado:

```tsx
<TextInput value={title} onChangeText={setTitle} />
```

### 6.8 Constantes de diseño (*design tokens*)
Colores, tamaños de letra, radios y sombras están en `src/constants/theme.ts`. Ningún componente escribe un color "a mano".

---

## 7. Componentes de interfaz

### Equivalencia con los componentes de Ionic del enunciado

| Ionic (enunciado) | React Native (este proyecto) | Componente |
|---|---|---|
| `ion-header` | `View` + `Text` con `accessibilityRole="header"` | `AppHeader` |
| `ion-content` | `SafeAreaView` + `ScrollView` + `KeyboardAvoidingView` | `App.tsx` |
| `ion-list` | `View` que recorre las tareas con `map` | `TaskList` |
| `ion-item` | `View` con casilla, título, descripción y botones | `TaskItem` |
| `ion-input` | `TextInput` | `TaskForm` |
| `ion-button` | `Pressable` | `TaskForm`, `TaskItem`, `FilterBar` |

### Cómo funciona editar
1. Se toca el botón **✎ Editar** de una tarea.
2. La pantalla sube hasta el formulario, que se llena con el título y la descripción, muestra **"EDITANDO TAREA"** y deja el cursor en el título. La tarjeta que se edita queda resaltada y su botón cambia a **"Editando…"**.
3. **Guardar** aplica los cambios y conserva el estado (completada o no) y la posición de la tarea. **Cancelar** descarta los cambios.
4. En ambos casos el formulario vuelve a **"Añadir"** y queda vacío.

---

## 8. Diseño de la interfaz y usabilidad

| Principio | Cómo se aplicó |
|---|---|
| **Jerarquía visual** | El título principal mide 49 px, los títulos de sección 24 px, los títulos de tarea 15 px y las descripciones 13–14 px en gris. Lo más importante se ve primero. |
| **Contraste** | Texto oscuro (`#28263A`) sobre fondo claro; el morado se reserva para acciones y estados activos. |
| **Balance** | Encabezado, progreso, formulario y lista comparten el mismo ancho y márgenes. En pantallas anchas el contenido se centra con un máximo de 760 px. |
| **Ritmo** | Tarjetas con el mismo radio, borde y sombra, y separaciones constantes entre ellas. |
| **Proporción** | Ningún texto mide menos de 11 px y todas las zonas táctiles miden al menos 44 px. |

**Usabilidad**
- Los botones de cada tarea tienen **ícono y texto** (**✎ Editar** y **× Eliminar**), así un usuario nuevo sabe qué hace cada uno sin adivinar. El de eliminar va en rojo para distinguirlo.
- Los botones **Añadir** y **Guardar** se deshabilitan si no hay título, con un mensaje que explica por qué.
- Los campos **se limpian** al guardar y, al presionar "siguiente" en el título, el cursor pasa a la descripción.
- El **modo edición** se distingue claramente: tiene su propia etiqueta, la tarjeta queda resaltada y aparece un botón Cancelar.
- Las tareas completadas quedan **tachadas** y la barra de progreso muestra el avance.
- Cuando no hay tareas, aparece un **mensaje** que explica qué hacer.
- **Accesibilidad:** cada botón tiene una etiqueta para lectores de pantalla, por ejemplo "Editar Estudiar para la prueba".

---

## 9. Pruebas

### Pruebas automáticas (`npm test`): 18 pruebas

| Archivo | Qué prueba |
|---|---|
| `tests/task-domain.test.ts` | Crear (con y sin descripción, título vacío), **editar** (cambia título y descripción, conserva id, estado y posición, título vacío e id inexistente), completar, eliminar, limpiar hechas, filtros y progreso. |
| `tests/task-repository.test.ts` | Distingue "sin datos" de una lista vacía, guarda y recarga sin compartir estado, mantiene la clave y el formato JSON, acepta tareas antiguas sin descripción y descarta registros inválidos, rechaza JSON corrupto, propaga errores de lectura y escritura, y prueba un flujo completo (añadir, completar, filtrar, limpiar, eliminar y recargar). |

### Pruebas manuales en teléfono (iPhone, Expo Go)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Agregar una tarea con título y descripción; los campos quedan vacíos | ✅ |
| 2 | Sin título, el botón Añadir está deshabilitado | ✅ |
| 3 | Completar una tarea actualiza el progreso | ✅ |
| 4 | Eliminar solo la tarea elegida | ✅ |
| 5 | Filtros Todas / Pendientes / Hechas y Limpiar hechas | ✅ |
| 6 | Cerrar y volver a abrir la app conserva las tareas | ✅ |
| 7 | Editar: el formulario se llena, Guardar aplica los cambios, Cancelar los descarta | ✅ |

---

## 10. Capturas de pantalla

**En iPhone (Expo Go)**

| Tarea con descripción | Se mantiene al reabrir | Completar tarea |
|:---:|:---:|:---:|
| <img src="docs/capturas/01-tarea-con-descripcion.jpg" width="220"> | <img src="docs/capturas/02-guardado-al-reabrir.jpg" width="220"> | <img src="docs/capturas/03-completar-tarea.jpg" width="220"> |

| Filtro Pendientes | Filtro Hechas |
|:---:|:---:|
| <img src="docs/capturas/04-filtro-pendientes.jpg" width="220"> | <img src="docs/capturas/05-filtro-hechas.jpg" width="220"> |

**Editar una tarea**

| Editando (formulario y tarjeta resaltada) | Después de guardar |
|:---:|:---:|
| <img src="docs/capturas/06-editar-formulario.jpg" width="220"> | <img src="docs/capturas/07-editar-resultado.jpg" width="220"> |

---

## 11. Trabajo en equipo

Cada integrante trabajó en su propia rama y la integró a `main`.

| Integrante | Aporte | Commits / PR |
|---|---|---|
| **Enderson Torres** ([@3nd3rs0n](https://github.com/3nd3rs0n)) | Creación del proyecto con Expo y React Native, primera versión de la app (completar, filtros, progreso y guardado en el dispositivo). | Commit inicial |
| **Ezequiel Tobar** ([@ezequieltobar](https://github.com/ezequieltobar)) | Interfaz: separó la app en componentes, agregó la **descripción** de las tareas, el tema visual, y mejoró la legibilidad y los tamaños táctiles. Luego agregó **editar tareas** y este informe. | PR #1 · rama `editar-tareas` |
| **Diego Rivera** ([@D3R5](https://github.com/D3R5)) | Lógica y pruebas: capa de **dominio**, patrón **repositorio**, inyección de dependencias y **15 pruebas automáticas**. | Commit en `main` |

---

## 12. Uso de agentes de IA

El docente permite el desarrollo potenciado por agentes. Como equipo, usamos asistentes de IA como apoyo durante el desarrollo: para analizar el enunciado y la rúbrica, proponer y revisar código, y redactar la documentación.

Las decisiones técnicas, la revisión del código y las pruebas fueron nuestras: cada integrante subió su parte en su propia rama y la app se probó en un teléfono físico.

**Lo que aprendimos:** la IA acelera el trabajo, pero hay que verificar lo que produce. Por eso revisamos el código con TypeScript (`npm run typecheck`) y con las pruebas automáticas (`npm test`), y probamos la app en el teléfono.

---

## 13. Cierre de la Unidad 1

La Unidad 1 entregó la gestión de tareas y la estructura base reutilizada por el equipo. La autenticación, los periféricos y la persistencia integrada quedaron incorporados en la [entrega de Unidad 2](#unidad-2--entrega-final), conservando las funcionalidades originales.
