import type { Task } from '../types/task';
import { normalizeTask } from '../domain/task-operations';
import type { TaskRepository } from './task-repository';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const taskMetadataBackupKey = (key: string) => `${key}.metadata-backup.v1`;

export function createStorageTaskRepository(
  storage: KeyValueStorage,
  storageKey: string,
  strict = false,
): TaskRepository {
  return {
    async load() {
      const savedTasks = await storage.getItem(storageKey);
      if (savedTasks === null) return null;

      const parsedTasks: unknown = JSON.parse(savedTasks);
      const normalized = Array.isArray(parsedTasks) ? parsedTasks.map(normalizeTask) : null;
      if (strict && (!normalized || normalized.some((task) => task === null))) {
        throw new Error('Los datos de tareas están dañados.');
      }
      return normalized?.filter((task): task is Task => task !== null) ?? null;
    },
    async save(tasks) {
      const normalized = tasks.map(normalizeTask);
      if (normalized.some((task) => task === null)) throw new Error('Tarea inválida.');
      const next = JSON.stringify(normalized);
      const incoming = JSON.stringify(tasks);
      const previous = await storage.getItem(storageKey);
      const originals: string[] = [];
      if (previous !== null) {
        const parsed: unknown = JSON.parse(previous);
        if (!Array.isArray(parsed)) throw new Error('Los datos de tareas están dañados.');
        const old = parsed.map(normalizeTask);
        if (strict && old.some((task) => task === null)) throw new Error('Los datos de tareas están dañados.');
        if (JSON.stringify(parsed) !== JSON.stringify(old)) originals.push(previous);
      }
      if (incoming !== next) originals.push(incoming);
      if (originals.length) {
        // Antes de reemplazar alias/fechas, conserva la representación original por cuenta.
        const key = taskMetadataBackupKey(storageKey);
        const saved = await storage.getItem(key);
        const history: unknown = saved === null ? [] : JSON.parse(saved);
        if (!Array.isArray(history) || !history.every((item) => typeof item === 'string'))
          throw new Error('El respaldo de metadatos está dañado.');
        const backups = [...new Set([...history, ...originals])];
        await storage.setItem(key, JSON.stringify(backups));
      }
      await storage.setItem(storageKey, next);
    },
  };
}
