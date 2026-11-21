import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  createCameraService,
  type CameraGateway,
  type PickerResult,
} from '../src/services/camera-service';
import type { PermissionService } from '../src/services/permission-service';
import type { PermissionState } from '../src/types/device';

const PHOTO = { uri: 'file:///cache/ImagePicker/foto.jpg', width: 1200, height: 900 };

/** Cámara y galería falsas: devuelven `result` o lanzan el error indicado. */
function fakeCamera(result: PickerResult | Error = { canceled: false, photo: PHOTO }) {
  const calls = { camera: 0, library: 0 };
  const answer = async () => {
    if (result instanceof Error) throw result;
    return result;
  };
  const camera: CameraGateway = {
    launchCamera() {
      calls.camera += 1;
      return answer();
    },
    launchLibrary() {
      calls.library += 1;
      return answer();
    },
  };
  return { camera, calls };
}

/** Servicio de permisos ya resuelto: la cámara no depende de cómo se pide el permiso. */
function fakePermissions(state: PermissionState = 'granted') {
  const asked: string[] = [];
  const permissions: PermissionService = {
    check: async () => state,
    ensure: async (kind) => {
      asked.push(kind);
      return state;
    },
    openSettings: async () => {},
  };
  return { permissions, asked };
}

test('con permiso, toma la foto y la devuelve', async () => {
  const { camera } = fakeCamera();
  const { permissions, asked } = fakePermissions('granted');
  const result = await createCameraService({ camera, permissions }).takePhoto();
  assert.deepEqual(result, { status: 'ok', value: PHOTO });
  assert.deepEqual(asked, ['camera']);
});

test('sin permiso no abre la cámara e informa si se puede volver a pedir', async () => {
  for (const state of ['denied', 'blocked'] as const) {
    const { camera, calls } = fakeCamera();
    const { permissions } = fakePermissions(state);
    const result = await createCameraService({ camera, permissions }).takePhoto();
    assert.deepEqual(result, { status: 'permission-denied', permission: state });
    assert.equal(calls.camera, 0);
  }
});

test('cerrar la cámara sin tomar foto es una cancelación, no un error', async () => {
  const { camera } = fakeCamera({ canceled: true });
  const { permissions } = fakePermissions();
  const result = await createCameraService({ camera, permissions }).takePhoto();
  assert.deepEqual(result, { status: 'cancelled' });
});

test('un error de la librería se devuelve como resultado y no se lanza', async () => {
  const { camera } = fakeCamera(new Error('Cámara no disponible'));
  const { permissions } = fakePermissions();
  const result = await createCameraService({ camera, permissions }).takePhoto();
  assert.deepEqual(result, { status: 'error', message: 'Cámara no disponible' });
});

test('la galería no pide permisos y devuelve la foto elegida', async () => {
  const { camera, calls } = fakeCamera();
  const { permissions, asked } = fakePermissions('blocked');
  const result = await createCameraService({ camera, permissions }).pickFromLibrary();
  assert.deepEqual(result, { status: 'ok', value: PHOTO });
  assert.deepEqual(asked, []);
  assert.equal(calls.library, 1);
});

test('cerrar la galería sin elegir es una cancelación', async () => {
  const { camera } = fakeCamera({ canceled: true });
  const { permissions } = fakePermissions();
  const result = await createCameraService({ camera, permissions }).pickFromLibrary();
  assert.deepEqual(result, { status: 'cancelled' });
});
