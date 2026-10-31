import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { STARTER_TASKS } from '../src/constants/starter-tasks';
import {
  clearCompletedTasks,
  createTask,
  deleteTask,
  toggleTask,
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
