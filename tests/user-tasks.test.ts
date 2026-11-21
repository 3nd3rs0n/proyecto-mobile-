import { strict as assert } from 'node:assert';
import { randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { createAuthService, type SecretStorage } from '../src/domain/auth-service';
import { createPasswordHasher } from '../src/domain/password';
import { createTaskSession } from '../src/repositories/user-task-repository';
import { createLegacyTaskMigration, createUserTaskRepository, LEGACY_TASKS_KEY, MIGRATION_KEY, userTasksKey } from '../src/repositories/user-task-repository';
import type { Task } from '../src/types/task';
import { taskMetadataBackupKey } from '../src/repositories/storage-task-repository';

function memory(): SecretStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}
const input = { title: 'Estudiar', description: 'Unidad 2' };
const legacyTask = { id: 'old-1', ...input, completed: false, imageUri: 'file:///foto.jpg', location: { latitude: -33.45, longitude: -70.66 }, extra: { fromTeammate: true } };

test('dos cuentas conservan sus fotos y GPS tras editar, recargar y rechazar operaciones ajenas', async () => {
  const storage = memory();
  const gpsA = { latitude: -33.45, longitude: -70.66, accuracy: 4, address: 'A', capturedAt: 1234, altitude: 50 };
  const gpsB = { latitude: 0, longitude: 0, accuracy: null, address: null, capturedAt: 5678, speed: 0 };
  const a = createTaskSession(createUserTaskRepository(storage, 'A', () => true), 'A', () => 'task-A');
  const b = createTaskSession(createUserTaskRepository(storage, 'B', () => true), 'B', () => 'task-B');
  await a.load(); await b.load();
  const [taskA] = await a.add({ ...input, imageUri: 'file:///A/photo.jpg', location: gpsA });
  const [taskB] = await b.add({ ...input, imageUri: 'file:///B/photo.jpg', location: gpsB });
  assert.match(taskA.createdAt!, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  await assert.rejects(b.update(taskA.id, { ...input, imageUri: taskB.imageUri, location: gpsB }), /pertenece/);
  await a.update(taskA.id, { ...input, title: 'Editada' });
  await a.toggle(taskA.id);
  await a.close(); await b.close();
  const reopenedA = createTaskSession(createUserTaskRepository(storage, 'A', () => true), 'A', randomUUID);
  const reopenedB = createTaskSession(createUserTaskRepository(storage, 'B', () => true), 'B', randomUUID);
  const [savedA] = await reopenedA.load(), [savedB] = await reopenedB.load();
  assert.equal(savedA.imageUri, taskA.imageUri); assert.deepEqual(savedA.location, gpsA);
  assert.equal(savedA.createdAt, taskA.createdAt); assert.equal(savedA.userId, 'A');
  assert.equal(savedB.imageUri, taskB.imageUri); assert.deepEqual(savedB.location, gpsB);
  assert.equal(savedB.userId, 'B');
  await assert.rejects(a.update(taskA.id, { ...input, imageUri: taskB.imageUri }), /cerrada/);
});

test('importar fotos/GPS de main normaliza campos, preserva el original y reserva propietario', async () => {
  const storage = memory();
  const source = JSON.stringify([{ ...legacyTask, imageUri: undefined, photoUri: 'file:///main.jpg',
    createdAt: 1_700_000_000_123, location: { ...legacyTask.location, accuracy: 9, address: 'GPS', capturedAt: 1234 } }]);
  storage.values.set(LEGACY_TASKS_KEY, source);
  const repository = createUserTaskRepository(storage, 'A', () => true);
  const migration = createLegacyTaskMigration(storage);
  const imported = await migration.importInto('A', repository);
  assert.equal(imported[0].imageUri, 'file:///main.jpg');
  assert.equal(imported[0].createdAt, '2023-11-14T22:13:20.123Z');
  assert.equal(imported[0].userId, 'A');
  assert.equal(imported[0].location?.accuracy, 9);
  assert.equal(imported[0].location?.capturedAt, 1234);
  assert.equal(storage.values.get(LEGACY_TASKS_KEY), source);
  assert.deepEqual(await repository.load(), imported);
  assert.equal(await migration.available('B'), 0);
});

test('la migración de metadatos de una cuenta respalda solo su clave y no toca otra cuenta', async () => {
  const storage = memory();
  const a = JSON.stringify([{ ...legacyTask, userId: 'A', photoUri: 'file:///alternate-A.jpg', createdAt: 0 }]);
  const b = JSON.stringify([{ ...legacyTask, userId: 'B', photoUri: 'file:///alternate-B.jpg', createdAt: 0 }]);
  storage.values.set(userTasksKey('A'), a); storage.values.set(userTasksKey('B'), b);
  const repository = createUserTaskRepository(storage, 'A', () => true);
  await repository.save((await repository.load())!);
  assert.deepEqual(JSON.parse(storage.values.get(taskMetadataBackupKey(userTasksKey('A')))! ), [a]);
  assert.equal(storage.values.get(userTasksKey('B')), b);
  assert.equal(storage.values.has(taskMetadataBackupKey(userTasksKey('B'))), false);
});

test('flujo A → logout → B → logout → A conserva tareas y bloquea edición/eliminación ajenas', async () => {
  const storage = memory();
  const secrets = memory();
  const auth = createAuthService(storage, secrets, createPasswordHasher(async (n) => randomBytes(n), secrets), randomUUID);
  const password = 'Prueba-2026';
  const a = await auth.register({ name: 'A', email: 'a@example.com', password, confirmation: password });
  const b = await auth.register({ name: 'B', email: 'b@example.com', password, confirmation: password });
  await auth.login(a.email, password);
  const repoA = createUserTaskRepository(storage, a.id, () => auth.getUser()?.id === a.id);
  const tasksA = createTaskSession(repoA, a.id, randomUUID);
  assert.deepEqual(await tasksA.load(), []);
  const [taskA] = await tasksA.add(input);
  assert.equal(taskA.userId, a.id);
  await tasksA.close();
  await auth.logout();
  assert.deepEqual(tasksA.snapshot(), []);
  await assert.rejects(tasksA.add(input), /cerrada/);
  await assert.rejects(repoA.load(), /activa/);
  await auth.login(b.email, password);
  const repoB = createUserTaskRepository(storage, b.id, () => auth.getUser()?.id === b.id);
  const tasksB = createTaskSession(repoB, b.id, randomUUID);
  assert.deepEqual(await tasksB.load(), []);
  await assert.rejects(tasksB.update(taskA.id, input), /pertenece/);
  await assert.rejects(tasksB.delete(taskA.id), /pertenece/);
  await assert.rejects(tasksB.toggle(taskA.id), /pertenece/);
  await assert.rejects(repoB.save([taskA]), /otra cuenta/);
  const [taskB] = await tasksB.add({ ...input, title: 'Ejercicio' });
  await tasksB.close();
  await auth.logout();
  await auth.login(a.email, password);
  const reopened = createTaskSession(repoA, a.id, randomUUID);
  assert.deepEqual(await reopened.load(), [taskA]);
  await reopened.update(taskA.id, { ...input, title: 'Editada' });
  await reopened.toggle(taskA.id);
  assert.equal(reopened.snapshot()[0].completed, true);
  await reopened.clearCompleted();
  assert.deepEqual(reopened.snapshot(), []);
  assert.deepEqual(JSON.parse(storage.values.get(userTasksKey(b.id))!), [taskB]);
});

test('crear, editar, completar y recargar preservan foto, ubicación, fecha y campos adicionales', async () => {
  const storage = memory();
  const repo = createUserTaskRepository(storage, 'A', () => true);
  const session = createTaskSession(repo, 'A', () => 'new');
  await session.load();
  const [task] = await session.add({ ...input, imageUri: legacyTask.imageUri, location: legacyTask.location });
  assert.ok(task.createdAt);
  await repo.save([{ ...task, extra: 'compañero' } as Task]);
  await session.load();
  await session.update(task.id, { ...input, title: 'Editada' });
  await session.toggle(task.id);
  const [reloaded] = await repo.load() ?? [];
  assert.equal(reloaded.imageUri, legacyTask.imageUri);
  assert.deepEqual(reloaded.location, legacyTask.location);
  assert.equal(reloaded.createdAt, task.createdAt);
  assert.equal((reloaded as Task & { extra: string }).extra, 'compañero');
  await session.delete(task.id);
  assert.deepEqual(await repo.load(), []);
});

test('lectura fallida o corrupta bloquea cambios y no sobrescribe almacenamiento', async () => {
  for (const raw of ['{bad', '{}', '[null]', JSON.stringify([{ ...legacyTask, userId: 'B' }])]) {
    const storage = memory();
    storage.values.set(userTasksKey('A'), raw);
    const session = createTaskSession(createUserTaskRepository(storage, 'A', () => true), 'A', randomUUID);
    await assert.rejects(session.load());
    await assert.rejects(session.add(input), /carguen/);
    assert.deepEqual(session.snapshot(), []);
    assert.equal(storage.values.get(userTasksKey('A')), raw);
  }
});

test('escritura fallida no publica cambios y permite reintentar', async () => {
  const storage = memory();
  const session = createTaskSession(createUserTaskRepository(storage, 'A', () => true), 'A', randomUUID);
  await session.load();
  const save = storage.setItem;
  storage.setItem = async () => { throw new Error('disco lleno'); };
  await assert.rejects(session.add(input), /lleno/);
  assert.deepEqual(session.snapshot(), []);
  storage.setItem = save;
  assert.equal((await session.add(input)).length, 1);
});

test('operaciones rápidas se serializan sin perder tareas', async () => {
  const storage = memory();
  const repo = createUserTaskRepository(storage, 'A', () => true);
  const session = createTaskSession(repo, 'A', randomUUID);
  await session.load();
  await Promise.all([session.add(input), session.add({ ...input, title: 'Otra' })]);
  assert.equal((await repo.load())?.length, 2);
});

test('una carga tardía tras cerrar la sesión no repuebla tareas en memoria', async () => {
  let resolve!: (value: Task[]) => void;
  const loading = new Promise<Task[]>((done) => { resolve = done; });
  const session = createTaskSession({ load: () => loading, async save() {} }, 'A', randomUUID);
  const opened = session.load();
  await Promise.resolve();
  const closed = session.close();
  resolve([{ ...legacyTask, userId: 'A' }]);
  await assert.rejects(opened, /cerrada/);
  await closed;
  assert.deepEqual(session.snapshot(), []);
});

test('una escritura tardía termina en la cuenta original y no reaparece tras el cierre', async () => {
  const storage = memory();
  const save = storage.setItem;
  let release!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((done) => { started = done; });
  const gate = new Promise<void>((done) => { release = done; });
  storage.setItem = async (key, value) => { started(); await gate; await save(key, value); };
  const session = createTaskSession(createUserTaskRepository(storage, 'A', () => true), 'A', randomUUID);
  await session.load();
  const added = session.add(input);
  await startedPromise;
  const closing = session.close();
  release();
  await assert.rejects(added, /cerrada/);
  await closing;
  assert.deepEqual(session.snapshot(), []);
  assert.equal(JSON.parse(storage.values.get(userTasksKey('A'))!).length, 1);
  assert.equal(storage.values.has(userTasksKey('B')), false);
});

test('migración explícita conserva respaldo y metadatos; no asigna nada al cargar y no duplica', async () => {
  const storage = memory();
  const original = JSON.stringify([legacyTask]);
  storage.values.set(LEGACY_TASKS_KEY, original);
  const repo = createUserTaskRepository(storage, 'A', () => true);
  const migration = createLegacyTaskMigration(storage);
  assert.equal(await repo.load(), null);
  assert.equal(await migration.available('A'), 1);
  assert.equal(storage.values.has(MIGRATION_KEY), false);
  const imported = await migration.importInto('A', repo);
  assert.deepEqual(imported, [{ ...legacyTask, userId: 'A', id: 'legacy-0-old-1' }]);
  assert.deepEqual(await migration.importInto('A', repo), imported);
  assert.equal(storage.values.get(LEGACY_TASKS_KEY), original);
  assert.equal(await migration.available('B'), 0);
  await assert.rejects(migration.importInto('B', createUserTaskRepository(storage, 'B', () => true)), /otra cuenta/);
});

test('migración interrumpida reserva propietario y puede reintentarse sin duplicar', async () => {
  const storage = memory();
  storage.values.set(LEGACY_TASKS_KEY, JSON.stringify([legacyTask]));
  const repo = createUserTaskRepository(storage, 'A', () => true);
  const migration = createLegacyTaskMigration(storage);
  const write = storage.setItem;
  storage.setItem = async (key, value) => {
    if (key === MIGRATION_KEY && value.includes('done')) throw new Error('interrumpido');
    return write(key, value);
  };
  assert.equal((await migration.importInto('A', repo)).length, 1);
  assert.equal((await repo.load())?.length, 1);
  assert.equal(await migration.available('B'), 0);
  storage.setItem = write;
  assert.equal((await createLegacyTaskMigration(storage).importInto('A', repo)).length, 1);
  assert.equal(JSON.parse(storage.values.get(MIGRATION_KEY)!).state, 'done');
});

test('una importación cuya copia falla mantiene el original y permite reintentar con el mismo propietario', async () => {
  const storage = memory();
  const original = JSON.stringify([legacyTask]);
  storage.values.set(LEGACY_TASKS_KEY, original);
  const repo = createUserTaskRepository(storage, 'A', () => true);
  const migration = createLegacyTaskMigration(storage);
  const write = storage.setItem;
  storage.setItem = async (key, value) => {
    if (key === userTasksKey('A')) throw new Error('copia interrumpida');
    return write(key, value);
  };
  await assert.rejects(migration.importInto('A', repo));
  assert.equal(storage.values.get(LEGACY_TASKS_KEY), original);
  assert.equal(await migration.available('B'), 0);
  storage.setItem = write;
  assert.equal((await migration.importInto('A', repo)).length, 1);
});
