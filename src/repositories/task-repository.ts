import type { Task } from '../types/task';

export interface TaskRepository {
  /** null: sin lista válida; []: lista vacía. Rechaza si falla la lectura. */
  load(): Promise<Task[] | null>;
  /** Guarda una copia de los datos. Rechaza si falla la escritura. */
  save(tasks: readonly Task[]): Promise<void>;
}
