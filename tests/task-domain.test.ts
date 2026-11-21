import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { STARTER_TASKS } from '../src/constants/starter-tasks';
import {
  clearCompletedTasks,
  createTask,
  deleteTask,
  toggleTask,
  updateTask,
} from '../src/domain/task-operations';
import { selectTasks, summarizeTasks } from '../src/domain/task-selectors';
import type { Task } from '../src/types/task';

const tasks: readonly Task[] = Object.freeze(
  STARTER_TASKS.map((task) => Object.freeze({ ...task })),
);

test('crear conserva el título y la descripción sin espacios exteriores', () => {
  assert.deepEqual(createTask({ title: '  Estudiar  ', description: '  SOLID  ' }, () => 'new'), {
    id: 'new', title: 'Estudiar', description: 'SOLID', completed: false,
  });
  assert.equal(createTask({ title: 'Comprar', description: '' }, () => 'empty')?.description, '');
});

test('un título vacío no crea una tarea ni consume un identificador', () => {
  assert.equal(createTask({ title: ' \n\t ', description: 'Opcional' }, () => {
    assert.fail('No debe generar un ID para una tarea inválida');
  }), null);
});

test('editar cambia título y descripción y conserva id, estado y posición', () => {
  const edited = updateTask(tasks, 'demo-1', { title: '  Planificar el mes  ', description: '  Nueva  ' });
  assert.deepEqual(edited[0], {
    id: 'demo-1', title: 'Planificar el mes', description: 'Nueva', completed: true,
  });
  assert.deepEqual([edited[1], edited[2]], [tasks[1], tasks[2]]);
  assert.equal(tasks[0].title, 'Planificar la semana');
});

test('editar permite borrar la descripción', () => {
  assert.equal(updateTask(tasks, 'demo-3', { title: 'Terminar', description: '   ' })[2].description, '');
});

test('crear y editar aceptan el alias de foto heredado y producen solo imageUri', () => {
  const input = { title: 'Foto', description: '', photoUri: 'file:///old.jpg' };
  const task = createTask(input, () => 'photo')!;
  assert.equal(task.imageUri, input.photoUri);
  assert.equal('photoUri' in task, false);
  const oldInput = { ...input, photoUri: 'file:///new.jpg' };
  const [edited] = updateTask([task], task.id, oldInput);
  assert.equal(edited.imageUri, 'file:///new.jpg');
  assert.equal('photoUri' in edited, false);
  const noReplacement = { ...input, photoUri: undefined };
  assert.equal(updateTask([edited], edited.id, noReplacement)[0].imageUri, edited.imageUri);
});

test('editar texto no pierde fecha, foto ni ningún campo GPS y no admite propietario del formulario', () => {
  const location = { latitude: -33.45, longitude: -70.66, accuracy: null, address: null,
    capturedAt: 1_700_000_000_123, altitude: 100, altitudeAccuracy: 8, heading: -1, speed: null };
  const task: Task = { id: 'gps', title: 'Original', description: '', completed: false, userId: 'A',
    imageUri: 'file:///A/photo.jpg', createdAt: '2026-11-21T00:00:00.000Z', location };
  const input = { title: 'Editada', description: 'Detalle', userId: 'B', createdAt: 'otra-fecha' };
  const [edited] = updateTask([task], task.id, input);
  assert.equal(edited.userId, 'A');
  assert.equal(edited.createdAt, task.createdAt);
  assert.equal(edited.imageUri, task.imageUri);
  assert.deepEqual(edited.location, location);
  assert.deepEqual(task.location, location);
});

test('editar con título vacío o id inexistente no cambia nada', () => {
  assert.deepEqual(updateTask(tasks, 'demo-1', { title: '  ', description: 'Algo' }), tasks);
  assert.deepEqual(updateTask(tasks, 'missing', { title: 'Nuevo', description: '' }), tasks);
});

test('completar es reversible y no modifica la lista original', () => {
  const toggled = toggleTask(tasks, 'demo-2');
  assert.equal(toggled[1].completed, true);
  assert.equal(tasks[1].completed, false);
  assert.deepEqual(toggleTask(toggled, 'demo-2'), tasks);
  assert.deepEqual(toggleTask(tasks, 'missing'), tasks);
});

test('eliminar conserva el orden y las demás tareas', () => {
  assert.deepEqual(deleteTask(tasks, 'demo-2'), [tasks[0], tasks[2]]);
  assert.deepEqual(deleteTask(tasks, 'missing'), tasks);
  assert.equal(tasks.length, 3);
});

test('limpiar hechas conserva solo las pendientes', () => {
  assert.deepEqual(clearCompletedTasks(tasks), [tasks[1], tasks[2]]);
  assert.deepEqual(clearCompletedTasks([]), []);
  assert.deepEqual(clearCompletedTasks([tasks[0]]), []);
});

test('los tres filtros conservan los resultados y el orden originales', () => {
  assert.deepEqual(selectTasks(tasks, 'all'), tasks);
  assert.deepEqual(selectTasks(tasks, 'active'), [tasks[1], tasks[2]]);
  assert.deepEqual(selectTasks(tasks, 'completed'), [tasks[0]]);
  assert.deepEqual(selectTasks([], 'all'), []);
});

test('el progreso conserva el redondeo y admite una lista vacía', () => {
  assert.deepEqual(summarizeTasks(tasks), {
    completedCount: 1, pendingCount: 2, completionPercent: 33,
  });
  assert.deepEqual(summarizeTasks([]), {
    completedCount: 0, pendingCount: 0, completionPercent: 0,
  });
  assert.equal(summarizeTasks([tasks[0]]).completionPercent, 100);
  assert.equal(summarizeTasks([tasks[1]]).completionPercent, 0);
});
