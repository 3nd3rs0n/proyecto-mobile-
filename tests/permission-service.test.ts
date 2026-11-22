import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  createPermissionService,
  toPermissionState,
  type PermissionGateway,
  type PermissionResponse,
} from '../src/services/permission-service';

const GRANTED: PermissionResponse = { granted: true, canAskAgain: true };
const DENIED: PermissionResponse = { granted: false, canAskAgain: true };
const BLOCKED: PermissionResponse = { granted: false, canAskAgain: false };

/** Permiso falso: `initial` es el estado actual; `answer`, lo que responde el usuario al diálogo. */
function fakeGateway(initial: PermissionResponse, answer: PermissionResponse | Error = initial) {
  let current = initial;
  const calls = { check: 0, request: 0 };
  const gateway: PermissionGateway = {
    async check() {
      calls.check += 1;
      return current;
    },
    async request() {
      calls.request += 1;
      if (answer instanceof Error) throw answer;
      current = answer;
      return current;
    },
  };
  return { gateway, calls };
}

function serviceWith(camera: PermissionGateway) {
  const unused = fakeGateway(GRANTED).gateway;
  let settingsOpened = 0;
  const service = createPermissionService({
    gateways: { camera, location: unused },
    openSettings: async () => {
      settingsOpened += 1;
    },
  });
  return { service, settingsOpened: () => settingsOpened };
}

test('traduce la respuesta de Expo a nuestros tres estados', () => {
  assert.equal(toPermissionState(GRANTED), 'granted');
  assert.equal(toPermissionState(DENIED), 'denied');
  assert.equal(toPermissionState(BLOCKED), 'blocked');
});

test('check informa el estado sin mostrar el diálogo', async () => {
  const { gateway, calls } = fakeGateway(DENIED);
  const { service } = serviceWith(gateway);
  assert.equal(await service.check('camera'), 'denied');
  assert.equal(calls.request, 0);
});

test('ensure no vuelve a preguntar si ya hay permiso', async () => {
  const { gateway, calls } = fakeGateway(GRANTED);
  const { service } = serviceWith(gateway);
  assert.equal(await service.ensure('camera'), 'granted');
  assert.equal(calls.request, 0);
});

test('ensure pregunta cuando se puede y devuelve lo que elige el usuario', async () => {
  const accepts = fakeGateway(DENIED, GRANTED);
  assert.equal(await serviceWith(accepts.gateway).service.ensure('camera'), 'granted');
  assert.equal(accepts.calls.request, 1);

  const rejects = fakeGateway(DENIED, DENIED);
  assert.equal(await serviceWith(rejects.gateway).service.ensure('camera'), 'denied');

  const blocksForever = fakeGateway(DENIED, BLOCKED);
  assert.equal(await serviceWith(blocksForever.gateway).service.ensure('camera'), 'blocked');
});

test('ensure no pregunta si el permiso está bloqueado', async () => {
  const { gateway, calls } = fakeGateway(BLOCKED);
  const { service } = serviceWith(gateway);
  assert.equal(await service.ensure('camera'), 'blocked');
  assert.equal(calls.request, 0);
});

test('un error de la librería se convierte en denied y no llega a la pantalla', async () => {
  const { gateway } = fakeGateway(DENIED, new Error('Falla nativa'));
  const { service } = serviceWith(gateway);
  assert.equal(await service.ensure('camera'), 'denied');

  const failingCheck: PermissionGateway = {
    check: async () => {
      throw new Error('Falla nativa');
    },
    request: async () => GRANTED,
  };
  assert.equal(await serviceWith(failingCheck).service.check('camera'), 'denied');
});

test('usa el permiso que corresponde a cada tipo', async () => {
  const camera = fakeGateway(GRANTED);
  const location = fakeGateway(BLOCKED);
  const service = createPermissionService({
    gateways: { camera: camera.gateway, location: location.gateway },
    openSettings: async () => {},
  });
  assert.equal(await service.ensure('location'), 'blocked');
  assert.equal(await service.ensure('camera'), 'granted');
  assert.equal(location.calls.check, 1);
});

test('openSettings abre los Ajustes', async () => {
  const { service, settingsOpened } = serviceWith(fakeGateway(BLOCKED).gateway);
  await service.openSettings();
  assert.equal(settingsOpened(), 1);
});
