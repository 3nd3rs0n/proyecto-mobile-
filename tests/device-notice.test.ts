import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { describeDeviceProblem } from '../src/domain/device-notice';

test('no avisa nada si salió bien o el usuario canceló', () => {
  assert.equal(describeDeviceProblem({ status: 'ok', value: 1 }, 'camera'), null);
  assert.equal(describeDeviceProblem({ status: 'cancelled' }, 'gallery'), null);
});

test('solo ofrece abrir Ajustes cuando el permiso está bloqueado', () => {
  const blocked = describeDeviceProblem({ status: 'permission-denied', permission: 'blocked' }, 'camera');
  const denied = describeDeviceProblem({ status: 'permission-denied', permission: 'denied' }, 'camera');
  assert.equal(blocked?.canOpenSettings, true);
  assert.match(blocked?.message ?? '', /la cámara/);
  assert.equal(denied?.canOpenSettings, false);
});

test('muestra el motivo cuando el periférico no está disponible', () => {
  const notice = describeDeviceProblem(
    { status: 'unavailable', reason: 'La ubicación del teléfono está desactivada.' },
    'location',
  );
  assert.deepEqual(notice, {
    message: 'La ubicación del teléfono está desactivada.',
    canOpenSettings: false,
  });
});

test('no muestra el error técnico de la librería al usuario', () => {
  const notice = describeDeviceProblem({ status: 'error', message: 'E_NATIVE_42' }, 'location');
  assert.equal(notice?.message.includes('E_NATIVE_42'), false);
  assert.match(notice?.message ?? '', /tu ubicación/);
});
