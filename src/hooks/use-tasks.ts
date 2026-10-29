import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Task, TaskFilter, TaskInput } from '../types/task';

/**
 * Lógica de la lista de tareas: estado, guardado en el dispositivo y operaciones.
 * Se separó de App.tsx para que los componentes solo se encarguen de dibujar.
 */

const STORAGE_KEY = 'paso-a-paso.tasks';

const STARTER_TASKS: Task[] = [
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

/**
 * Comprueba que un valor leído del almacenamiento sea una tarea válida.
 * Las tareas guardadas antes de existir la descripción se aceptan con descripción vacía.
 */
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
    description: typeof task.description === 'string' ? task.description : '',
    completed: task.completed,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(STARTER_TASKS);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [storageReady, setStorageReady] = useState(false);

  // Carga las tareas guardadas al abrir la app.
  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem(STORAGE_KEY);
        const parsedTasks: unknown =
          savedTasks === null ? STARTER_TASKS : JSON.parse(savedTasks);
        if (mounted) {
          setTasks(
            Array.isArray(parsedTasks)
              ? parsedTasks.map(toTask).filter((task): task is Task => task !== null)
              : STARTER_TASKS,
          );
        }
      } catch {
        if (mounted) setTasks(STARTER_TASKS);
      } finally {
        if (mounted) setStorageReady(true);
      }
    };

    void loadTasks();
    return () => {
      mounted = false;
    };
  }, []);

  // Guarda las tareas cada vez que cambian.
  useEffect(() => {
    if (!storageReady) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {
      // La app sigue funcionando aunque el dispositivo no permita guardar datos.
    });
  }, [tasks, storageReady]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const completionPercent =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const addTask = ({ title, description }: TaskInput) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setTasks((currentTasks) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: cleanTitle,
        description: description.trim(),
        completed: false,
      },
      ...currentTasks,
    ]);
  };

  const toggleTask = (id: string) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const deleteTask = (id: string) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
  };

  return {
    tasks,
    visibleTasks,
    filter,
    setFilter,
    completedCount,
    pendingCount,
    completionPercent,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted,
  };
}
