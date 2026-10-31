import type { Task } from '../types/task';
import type { TaskRepository } from './task-repository';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function toTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) return null;

  const task = value as Partial<Task>;
  if (
    typeof task.id !== 'string' ||
    typeof task.title !== 'string' ||
    typeof task.completed !== 'boolean'
  ) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    // Las tareas antiguas no tienen descripción.
    description: typeof task.description === 'string' ? task.description : '',
    completed: task.completed,
  };
}

export function createStorageTaskRepository(
  storage: KeyValueStorage,
  storageKey: string,
): TaskRepository {
  return {
    async load() {
      const savedTasks = await storage.getItem(storageKey);
      if (savedTasks === null) return null;

      const parsedTasks: unknown = JSON.parse(savedTasks);
      return Array.isArray(parsedTasks)
        ? parsedTasks.map(toTask).filter((task): task is Task => task !== null)
        : null;
    },
    async save(tasks) {
      return storage.setItem(storageKey, JSON.stringify(tasks));
    },
  };
}
