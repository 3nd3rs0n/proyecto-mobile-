import type { Task } from '../types/task';

export const STARTER_TASKS: Task[] = [
  {
    id: 'demo-1',
    title: 'Planificar la semana',
    description: 'Revisar el calendario y anotar las entregas.',
    completed: true,
  },
  {
    id: 'demo-2',
    title: 'Preparar una lista de compras',
    description: '',
    completed: false,
  },
  {
    id: 'demo-3',
    title: 'Terminar el proyecto de clase',
    description: 'To-Do List en React Native para la Unidad 1.',
    completed: false,
  },
];
