import * as operations from '../domain/task-operations';
import type { Task, TaskInput } from '../types/task';
import { createStorageTaskRepository, type KeyValueStorage } from './storage-task-repository';
import type { TaskRepository } from './task-repository';

export const LEGACY_TASKS_KEY = 'paso-a-paso.tasks';
export const MIGRATION_KEY = 'paso-a-paso.tasks.migration.v1';
export const userTasksKey = (userId: string) => `paso-a-paso.tasks.user.${userId}`;

/** Adaptador del repositorio existente; no acepta un propietario enviado por la UI. */
export function createUserTaskRepository(storage: KeyValueStorage, userId: string, isActive: () => boolean): TaskRepository {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(userId)) throw new Error('Usuario inválido.');
  const repository = createStorageTaskRepository(storage, userTasksKey(userId), true);
  const checkAccess = () => { if (!isActive()) throw new Error('La sesión ya no está activa.'); };
  return {
    async load() {
      checkAccess();
      const tasks = await repository.load();
      checkAccess();
      if (tasks?.some((task) => task.userId !== userId)) throw new Error('Propietario de tareas inválido.');
      return tasks;
    },
    async save(tasks) {
      checkAccess();
      if (tasks.some((task) => task.userId !== userId)) throw new Error('No puedes guardar tareas de otra cuenta.');
      await repository.save(tasks);
    },
  };
}

type Claim = { userId: string; state: 'pending' | 'done' };

/** Importación explícita, reintentable y sin borrar el original de Unidad 1. */
export function createLegacyTaskMigration(storage: KeyValueStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  const readClaim = async (): Promise<Claim | null> => {
    const raw = await storage.getItem(MIGRATION_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (typeof value?.userId !== 'string' || !['pending', 'done'].includes(value.state))
      throw new Error('El registro de importación está dañado.');
    return value;
  };
  const legacy = createStorageTaskRepository(storage, LEGACY_TASKS_KEY, true);
  return {
    async available(userId: string) {
      const claim = await readClaim();
      if (claim && (claim.state === 'done' || claim.userId !== userId)) return 0;
      return (await legacy.load() ?? []).filter((task) => task.userId === undefined).length;
    },
    importInto(userId: string, repository: TaskRepository): Promise<Task[]> {
      const result = queue.then(async () => {
        const claim = await readClaim();
        if (claim && claim.userId !== userId) throw new Error('Las tareas antiguas ya fueron reclamadas por otra cuenta.');
        const current = await repository.load() ?? [];
        if (claim?.state === 'done') return current;
        const old = (await legacy.load() ?? []).filter((task) => task.userId === undefined);
        // Reserva primero: tras una interrupción solo esta misma cuenta puede continuar.
        await storage.setItem(MIGRATION_KEY, JSON.stringify({ userId, state: 'pending' }));
        const imported = old.map((task, index) => ({ ...task, userId, id: `legacy-${index}-${task.id}` }));
        const ids = new Set(current.map((task) => task.id));
        const merged = [...current, ...imported.filter((task) => !ids.has(task.id))];
        await repository.save(merged);
        try {
          await storage.setItem(MIGRATION_KEY, JSON.stringify({ userId, state: 'done' }));
        } catch {
          // La copia ya está guardada: devolverla evita que el estado anterior la sobrescriba.
          // La reserva pending permite confirmar de nuevo con la misma cuenta al reabrir.
        }
        return merged;
      });
      queue = result.catch(() => undefined);
      return result;
    },
  };
}

/** Estado de una sola sesión. Espera la escritura antes de publicar cambios. */
export function createTaskSession(repository: TaskRepository, userId: string, createId: operations.TaskIdFactory) {
  let tasks: Task[] = [];
  let ready = false;
  let disposed = false;
  let queue: Promise<unknown> = Promise.resolve();
  const check = () => { if (disposed) throw new Error('Sesión de tareas cerrada.'); };
  const owned = (items: Task[]) => {
    if (items.some((task) => task.userId !== userId)) throw new Error('Propietario inválido.');
    return items;
  };
  const serial = <T>(action: () => Promise<T>) => {
    const result = queue.then(async () => { check(); return action(); });
    queue = result.catch(() => undefined);
    return result;
  };
  const change = (operation: (current: Task[]) => Task[]) => serial(async () => {
    if (!ready) throw new Error('Espera a que se carguen tus tareas.');
    const next = owned(operation(tasks));
    await repository.save(next);
    check();
    tasks = next;
    return [...tasks];
  });
  const checkTask = (id: string) => {
    if (!tasks.some((task) => task.id === id && task.userId === userId))
      throw new Error('La tarea no pertenece a esta cuenta.');
  };
  return {
    load: () => serial(async () => {
      const loaded = owned(await repository.load() ?? []);
      check();
      tasks = loaded;
      ready = true;
      return [...tasks];
    }),
    add: (input: TaskInput) => change((current) => {
      const task = operations.createTask(input, createId);
      return task ? [{ ...task, userId, createdAt: new Date().toISOString() }, ...current] : current;
    }),
    update: (id: string, input: TaskInput) => change((current) => {
      checkTask(id); return operations.updateTask(current, id, input);
    }),
    toggle: (id: string) => change((current) => {
      checkTask(id); return operations.toggleTask(current, id);
    }),
    delete: (id: string) => change((current) => {
      checkTask(id); return operations.deleteTask(current, id);
    }),
    clearCompleted: () => change(operations.clearCompletedTasks),
    importLegacy: (importer: () => Promise<Task[]>) => serial(async () => {
      if (!ready) throw new Error('Espera a que se carguen tus tareas.');
      const imported = owned(await importer());
      check();
      tasks = imported;
      return [...tasks];
    }),
    async close() {
      disposed = true;
      await queue;
      tasks = [];
      ready = false;
    },
    flush: async () => { await queue; },
    snapshot: () => [...tasks],
  };
}
