/** Una tarea de la lista: título obligatorio y descripción opcional. */
export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

/** Datos que entrega el formulario al guardar. */
export type TaskInput = Pick<Task, 'title' | 'description'>;

export type TaskFilter = 'all' | 'active' | 'completed';
