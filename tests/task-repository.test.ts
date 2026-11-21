import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { Task } from '../src/types/task';

import { STARTER_TASKS } from '../src/constants/starter-tasks';
import { clearCompletedTasks, createTask, deleteTask, toggleTask } from '../src/domain/task-operations';
import { selectTasks, summarizeTasks } from '../src/domain/task-selectors';
import {
  createStorageTaskRepository,
  taskMetadataBackupKey,
  type KeyValueStorage,
} from '../src/repositories/storage-task-repository';

const storageKey = 'paso-a-paso.tasks';

test('convierte photoUri y fecha numérica sin escribir al leer; respalda antes de guardar', async () => {
  const original = JSON.stringify([{ id: 'old-photo', title: 'Foto', completed: false,
    photoUri: 'file:///documents/photo.jpg', createdAt: 1_700_000_000_123,
    location: { latitude: -33.45, longitude: -70.66, accuracy: null, address: 'Santiago', capturedAt: 1_700_000_000_000 },
  }]);
  const storage = memoryStorage(original);
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const loaded = await repository.load();
  assert.ok(loaded);
  assert.equal(loaded[0].imageUri, 'file:///documents/photo.jpg');
  assert.equal('photoUri' in loaded[0], false);
  assert.equal(loaded[0].createdAt, '2023-11-14T22:13:20.123Z');
  assert.equal(await storage.getItem(storageKey), original);
  await repository.save(loaded);
  const persisted = JSON.parse((await storage.getItem(storageKey))!);
  assert.equal('photoUri' in persisted[0], false);
  assert.deepEqual(await repository.load(), loaded);
  assert.ok(JSON.parse((await storage.getItem(taskMetadataBackupKey(storageKey)))!).includes(original));
});

test('si ambas URI difieren usa imageUri y conserva ambas en el respaldo original', async () => {
  const original = JSON.stringify([{ ...STARTER_TASKS[0], imageUri: 'file:///image.jpg', photoUri: 'file:///photo.jpg' }]);
  const storage = memoryStorage(original);
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const loaded = (await repository.load())!;
  assert.equal(loaded[0].imageUri, 'file:///image.jpg');
  await repository.save(loaded);
  const backup = await storage.getItem(taskMetadataBackupKey(storageKey));
  assert.deepEqual(JSON.parse(backup!), [original]);
  await repository.save(loaded.map((task) => ({ ...task, title: 'Editada' })));
  assert.equal(await storage.getItem(taskMetadataBackupKey(storageKey)), backup);
});

test('las tareas actuales con fotos/GPS no generan respaldos en guardados normales', async () => {
  const storage = memoryStorage();
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const task: Task = { ...STARTER_TASKS[0], imageUri: 'file:///actual.jpg',
    location: { latitude: 1, longitude: 2, accuracy: null }, userId: 'A',
    createdAt: '2026-11-21T00:00:00.000Z' };
  await repository.save([task]);
  await repository.save([{ ...task, title: 'Editada' }]);
  assert.equal(await storage.getItem(taskMetadataBackupKey(storageKey)), null);
  assert.deepEqual((await repository.load())![0].location, task.location);
});

test('normaliza GPS nativo sin perder precisión, altitud, velocidad, dirección o fecha real', async () => {
  const gps = { coords: { latitude: 0, longitude: 180, accuracy: 3.2, altitude: 123.4,
    altitudeAccuracy: null, heading: 90, speed: 2.5, sensorExtra: 'conservar' },
    timestamp: 1_700_000_000_123, mocked: false, address: 'Dirección' };
  const storage = memoryStorage(JSON.stringify([{ ...STARTER_TASKS[0], location: gps,
    createdAt: '2023-11-14T19:13:20.123-03:00' }]));
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const [task] = (await repository.load())!;
  assert.equal(task.createdAt, '2023-11-14T22:13:20.123Z');
  assert.deepEqual(task.location, { ...gps.coords, timestamp: gps.timestamp, mocked: false,
    address: gps.address, capturedAt: gps.timestamp });
  await repository.save([task]);
  assert.deepEqual((await repository.load())![0].location, task.location);
});

test('no inventa fechas para tareas antiguas y conserva fechas ISO normalizadas', async () => {
  const storage = memoryStorage(JSON.stringify([STARTER_TASKS[0], { ...STARTER_TASKS[1], createdAt: 0 },
    { ...STARTER_TASKS[2], createdAt: '2026-11-21T12:00:00Z' }]));
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const tasks = (await repository.load())!;
  assert.equal(tasks[0].createdAt, undefined);
  assert.equal(tasks[1].createdAt, '1970-01-01T00:00:00.000Z');
  assert.equal(tasks[2].createdAt, '2026-11-21T12:00:00.000Z');
});

test('metadatos inválidos bloquean lectura/escritura y conservan los datos originales', async () => {
  for (const metadata of [{ createdAt: 'sin-fecha' }, { createdAt: 9e20 }, { imageUri: 42 },
    { location: { latitude: 91, longitude: 10 } }, { location: { latitude: 1, longitude: 2, speed: 'mal' } }]) {
    const original = JSON.stringify([{ ...STARTER_TASKS[0], ...metadata }]);
    const storage = memoryStorage(original);
    const repository = createStorageTaskRepository(storage, storageKey, true);
    await assert.rejects(repository.load());
    await assert.rejects(repository.save(STARTER_TASKS));
    assert.equal(await storage.getItem(storageKey), original);
  }
});

test('si no puede guardar el respaldo, no reemplaza las tareas antiguas', async () => {
  const original = JSON.stringify([{ ...STARTER_TASKS[0], photoUri: 'file:///old.jpg', createdAt: 0 }]);
  const storage = memoryStorage(original);
  const repository = createStorageTaskRepository(storage, storageKey, true);
  const loaded = (await repository.load())!;
  const write = storage.setItem;
  storage.setItem = async (key, value) => {
    if (key === taskMetadataBackupKey(storageKey)) throw new Error('sin espacio para respaldo');
    return write(key, value);
  };
  await assert.rejects(repository.save(loaded), /respaldo/);
  assert.equal(await storage.getItem(storageKey), original);
  storage.setItem = write;
  await repository.save(loaded);
  assert.deepEqual(await repository.load(), loaded);
});

function memoryStorage(initial?: string): KeyValueStorage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(storageKey, initial);
  return {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  };
}

test('distingue datos ausentes de una lista guardada vacía', async () => {
  const repository = createStorageTaskRepository(memoryStorage(), storageKey);
  assert.equal(await repository.load(), null);
  await repository.save([]);
  assert.deepEqual(await repository.load(), []);
});

test('guarda una copia y permite recargarla sin compartir estado', async () => {
  const repository = createStorageTaskRepository(memoryStorage(), storageKey);
  const tasks = STARTER_TASKS.map((task) => ({ ...task }));
  await repository.save(tasks);
  tasks[0].title = 'Cambio posterior';
  const loaded = await repository.load();
  assert.deepEqual(loaded, STARTER_TASKS);
  assert.ok(loaded);
  loaded[0].title = 'Cambio en la lectura';
  assert.deepEqual(await repository.load(), STARTER_TASKS);
});

test('mantiene la clave y el formato JSON existentes', async () => {
  const storage = memoryStorage();
  const repository = createStorageTaskRepository(storage, storageKey);
  await repository.save(STARTER_TASKS);
  assert.equal(await storage.getItem(storageKey), JSON.stringify(STARTER_TASKS));
  assert.deepEqual(await repository.load(), STARTER_TASKS);
});

test('acepta tareas antiguas y descarta registros inválidos sin reordenarlos', async () => {
  const oldTask = { id: 'old', title: 'Tarea antigua', completed: false };
  const storage = memoryStorage(JSON.stringify([
    null, 12, oldTask, { id: 1, title: 'Inválida', completed: false },
    { id: 'bad', title: 'Inválida', completed: 'false' },
    { id: 'no-title', completed: false },
    { ...oldTask, id: 'description', description: 99 }, STARTER_TASKS[0],
  ]));
  const repository = createStorageTaskRepository(storage, storageKey);
  assert.deepEqual(await repository.load(), [
    { ...oldTask, description: '' },
    { ...oldTask, id: 'description', description: '' },
    STARTER_TASKS[0],
  ]);
});

test('un JSON sin lista no se confunde con una lista guardada vacía', async () => {
  for (const value of ['null', '{}', '42', '"texto"']) {
    const repository = createStorageTaskRepository(memoryStorage(value), storageKey);
    assert.equal(await repository.load(), null);
  }
  const repository = createStorageTaskRepository(memoryStorage('[null, 42]'), storageKey);
  assert.deepEqual(await repository.load(), []);
});

test('rechaza JSON corrupto', async () => {
  const repository = createStorageTaskRepository(memoryStorage('{broken'), storageKey);
  await assert.rejects(() => repository.load(), SyntaxError);
});

test('propaga los errores de lectura y escritura', async () => {
  const failure = new Error('Dispositivo sin acceso');
  const repository = createStorageTaskRepository({
    async getItem() { throw failure; },
    async setItem() { throw failure; },
  }, storageKey);
  await assert.rejects(() => repository.load(), (error) => error === failure);
  await assert.rejects(() => repository.save([]), (error) => error === failure);
});

test('permite añadir, completar, filtrar, limpiar, eliminar y recargar tareas', async () => {
  const storage = memoryStorage(JSON.stringify(STARTER_TASKS));
  const repository = createStorageTaskRepository(storage, storageKey);
  const added = createTask({ title: '  Nueva tarea ', description: ' Detalle ' }, () => 'new');
  assert.ok(added);
  const savedTasks = await repository.load();
  assert.ok(savedTasks);
  let tasks = [added, ...savedTasks];
  assert.equal(tasks[0].id, 'new');
  tasks = toggleTask(tasks, 'new');
  assert.deepEqual(selectTasks(tasks, 'completed').map((task) => task.id), ['new', 'demo-1']);
  assert.equal(summarizeTasks(tasks).completionPercent, 50);
  tasks = deleteTask(clearCompletedTasks(tasks), 'demo-2');
  await repository.save(tasks);
  const reopenedRepository = createStorageTaskRepository(storage, storageKey);
  assert.deepEqual(await reopenedRepository.load(), [STARTER_TASKS[2]]);
});
