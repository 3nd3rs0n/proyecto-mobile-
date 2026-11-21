import type { Task, TaskInput, TaskLocation } from '../types/task';

export type TaskIdFactory = () => string;

/** Acepta los formatos persistidos por ambos integrantes sin inventar fechas. */
export function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.completed !== 'boolean') return null;
  const { photoUri, imageUri, createdAt, location } = raw;
  for (const uri of [imageUri, photoUri]) {
    if (uri != null && typeof uri !== 'string') throw new Error('Fotografía de tarea inválida.');
  }
  const image = typeof imageUri === 'string' && imageUri.trim() ? imageUri : photoUri;
  let date: string | undefined;
  if (createdAt != null) {
    if (typeof createdAt !== 'number' && (typeof createdAt !== 'string' ||
      !/^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt)))
      throw new Error('Fecha de creación inválida.');
    const parsed = new Date(createdAt);
    if (!Number.isFinite(parsed.getTime())) throw new Error('Fecha de creación inválida.');
    date = parsed.toISOString();
  }
  const task: Record<string, unknown> = {
    ...raw,
    id: raw.id, title: raw.title, completed: raw.completed,
    description: typeof raw.description === 'string' ? raw.description : '',
  };
  delete task.photoUri;
  if (typeof image === 'string' && image.trim()) task.imageUri = image;
  else delete task.imageUri;
  if (location != null) task.location = normalizeTaskLocation(location);
  else delete task.location;
  if (date !== undefined) task.createdAt = date;
  else delete task.createdAt;
  return task as Task;
}

function normalizeTaskLocation(value: unknown): TaskLocation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ubicación inválida.');
  const raw = value as Record<string, unknown>;
  const { coords, ...rest } = raw;
  if (coords != null && (typeof coords !== 'object' || Array.isArray(coords))) throw new Error('Coordenadas inválidas.');
  // Acepta TaskLocation plano y el resultado nativo { coords, timestamp } de Expo.
  const location = { ...(coords as Record<string, unknown> | undefined), ...rest };
  if (typeof location.latitude !== 'number' || !Number.isFinite(location.latitude) ||
    Math.abs(location.latitude) > 90 || typeof location.longitude !== 'number' ||
    !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180)
    throw new Error('Coordenadas inválidas.');
  for (const field of ['accuracy', 'altitude', 'altitudeAccuracy', 'heading', 'speed']) {
    const number = location[field];
    if (number != null && (typeof number !== 'number' || !Number.isFinite(number)))
      throw new Error('Metadatos GPS inválidos.');
  }
  if (location.address != null && typeof location.address !== 'string') throw new Error('Dirección inválida.');
  if (location.capturedAt === undefined && typeof location.timestamp === 'number') location.capturedAt = location.timestamp;
  if (location.capturedAt !== undefined && (typeof location.capturedAt !== 'number' || !Number.isFinite(location.capturedAt)))
    throw new Error('Fecha de captura GPS inválida.');
  return location as TaskLocation;
}

export function createTask(
  input: TaskInput,
  createId: TaskIdFactory,
): Task | null {
  const { title, description, imageUri, location } = input;
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  return normalizeTask({
    id: createId(),
    title: cleanTitle,
    description: description.trim(),
    completed: false,
    ...(imageUri !== undefined ? { imageUri } : {}),
    ...('photoUri' in input ? { photoUri: input.photoUri } : {}),
    ...(location !== undefined ? { location: { ...location } } : {}),
  });
}

/**
 * Cambia el título y la descripción de una tarea; conserva su id, su estado y su posición.
 * Con un título vacío no cambia nada.
 */
export function updateTask(
  tasks: readonly Task[],
  id: string,
  input: TaskInput,
): Task[] {
  const { title, description, imageUri, location } = input;
  const cleanTitle = title.trim();
  if (!cleanTitle) return [...tasks];

  return tasks.map((task) =>
    task.id === id ? normalizeTask({
      ...task, title: cleanTitle, description: description.trim(),
      ...(imageUri !== undefined ? { imageUri } :
        'photoUri' in input && input.photoUri !== undefined ? { imageUri: input.photoUri } : {}),
      ...(location !== undefined ? { location: { ...location } } : {}),
    })! : task,
  );
}

export function toggleTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
}

export function deleteTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function clearCompletedTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => !task.completed);
}
