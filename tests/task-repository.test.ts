import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { STARTER_TASKS } from '../src/constants/starter-tasks';
import { clearCompletedTasks, createTask, deleteTask, toggleTask } from '../src/domain/task-operations';
import { selectTasks, summarizeTasks } from '../src/domain/task-selectors';
import {
  createStorageTaskRepository,
  type KeyValueStorage,
} from '../src/repositories/storage-task-repository';

const storageKey = 'paso-a-paso.tasks';

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
