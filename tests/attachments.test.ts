import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createCameraService, type CameraGateway, type PickerResult } from '../src/services/camera-service';
import { createLocationService, type Coordinates, type LocationGateway } from '../src/services/location-service';
import { createPermissionService, type PermissionGatewayMap } from '../src/services/permission-service';
import { createPhotoStorage, type FileGateway } from '../src/services/photo-storage';

const granted = { granted: true, canAskAgain: true };
const denied = { granted: false, canAskAgain: true };
const blocked = { granted: false, canAskAgain: false };

const grantedPermissions = () => createPermissionService({
  camera: { check: async () => granted, request: async () => granted },
  mediaLibrary: { check: async () => granted, request: async () => granted },
  location: { check: async () => granted, request: async () => granted },
}, async () => undefined);

function memoryFiles(documentDirectory: string | null = 'file:///docs/'): FileGateway & {
  files: Map<string, string>;
  directories: Set<string>;
} {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  return {
    documentDirectory,
    files,
    directories,
    async copy(from, to) {
      const content = files.get(from);
      if (content === undefined) throw new Error('Archivo de origen inexistente.');
      files.set(to, content);
    },
    async delete(uri) { files.delete(uri); },
    async exists(uri) { return files.has(uri) || directories.has(uri); },
    async makeDirectory(uri) { directories.add(uri); },
  };
}

const coordinates = (overrides: Partial<Coordinates> = {}): Coordinates => ({
  latitude: -33.45,
  longitude: -70.66,
  accuracy: 5,
  capturedAt: 1000,
  ...overrides,
});

test('permisos: granted no vuelve a preguntar, denied pregunta y blocked no', async () => {
  let requests = 0;
  const gateways: PermissionGatewayMap = {
    camera: { check: async () => granted, request: async () => { requests++; return granted; } },
    mediaLibrary: { check: async () => blocked, request: async () => { requests++; return granted; } },
    location: { check: async () => denied, request: async () => { requests++; return granted; } },
  };
  const service = createPermissionService(gateways, async () => undefined);

  assert.equal(await service.ensure('camera'), 'granted');
  assert.equal(await service.ensure('mediaLibrary'), 'blocked');
  assert.equal(await service.ensure('location'), 'granted');
  assert.equal(requests, 1);
  assert.equal(await service.check('mediaLibrary'), 'blocked');
});

test('fotos: copia la imagen temporal a photos/ con la extensión original', async () => {
  const files = memoryFiles();
  files.files.set('file:///tmp/captura.png', 'bytes-de-la-foto');
  const storage = createPhotoStorage(files);

  const uri = await storage.persist('file:///tmp/captura.png', 'tarea-1');

  assert.equal(uri, 'file:///docs/photos/tarea-1.png');
  assert.equal(files.files.get(uri), 'bytes-de-la-foto');
  assert.ok(files.directories.has('file:///docs/photos/'));
});

test('fotos: eliminar es tolerante a archivos inexistentes y sin almacenamiento falla', async () => {
  const files = memoryFiles();
  const storage = createPhotoStorage(files);

  await storage.remove('file:///docs/photos/no-existe.jpg');

  const unavailable = createPhotoStorage(memoryFiles(null));
  await assert.rejects(() => unavailable.persist('file:///tmp/a.jpg', 'tarea-2'));
});

test('cámara: pide permiso, devuelve la foto y no exige permiso para la galería', async () => {
  let requests = 0;
  const permissions = createPermissionService({
    camera: { check: async () => denied, request: async () => { requests++; return granted; } },
    mediaLibrary: { check: async () => blocked, request: async () => { requests++; return blocked; } },
    location: { check: async () => granted, request: async () => granted },
  }, async () => undefined);
  const photo = { uri: 'file:///tmp/foto.jpg', width: 10, height: 20 };
  const camera: CameraGateway = {
    launchCamera: async (): Promise<PickerResult> => ({ canceled: false, photo }),
    launchLibrary: async (): Promise<PickerResult> => ({ canceled: true }),
  };
  const service = createCameraService({ camera, permissions });

  assert.deepEqual(await service.takePhoto(), { status: 'ok', value: photo });
  assert.equal(requests, 1);
  assert.deepEqual(await service.pickFromLibrary(), { status: 'cancelled' });
});

test('cámara: un permiso bloqueado no abre la cámara', async () => {
  let launched = 0;
  const permissions = createPermissionService({
    camera: { check: async () => blocked, request: async () => { launched++; return granted; } },
    mediaLibrary: { check: async () => blocked, request: async () => blocked },
    location: { check: async () => granted, request: async () => granted },
  }, async () => undefined);
  const camera: CameraGateway = {
    launchCamera: async () => { launched++; return { canceled: true }; },
    launchLibrary: async () => { launched++; return { canceled: true }; },
  };
  const service = createCameraService({ camera, permissions });

  assert.deepEqual(await service.takePhoto(), { status: 'permission-denied', permission: 'blocked' });
  assert.equal(launched, 0);
});

test('ubicación: devuelve coordenadas, dirección y fecha de captura', async () => {
  const location: LocationGateway = {
    servicesEnabled: async () => true,
    getCurrent: async () => coordinates({ capturedAt: undefined }),
    getLastKnown: async () => null,
    reverseGeocode: async () => 'Santiago, Chile',
  };
  const service = createLocationService({
    location,
    permissions: grantedPermissions(),
    timeoutMs: 1000,
    now: () => 5000,
  });

  const result = await service.getTaskLocation();
  if (result.status !== 'ok') assert.fail(`Estado inesperado: ${result.status}`);
  assert.equal(result.value.address, 'Santiago, Chile');
  assert.equal(result.value.capturedAt, 5000);
  assert.equal(result.value.latitude, -33.45);
});

test('ubicación: usa la última conocida si el GPS tarda demasiado', async () => {
  const location: LocationGateway = {
    servicesEnabled: async () => true,
    getCurrent: () => new Promise<Coordinates>(() => undefined),
    getLastKnown: async () => coordinates({ capturedAt: 1234 }),
    reverseGeocode: async () => null,
  };
  const service = createLocationService({
    location,
    permissions: grantedPermissions(),
    timeoutMs: 10,
    now: () => 9999,
  });

  const result = await service.getTaskLocation();
  if (result.status !== 'ok') assert.fail(`Estado inesperado: ${result.status}`);
  assert.equal(result.value.capturedAt, 1234);
  assert.equal(result.value.address, null);
});

test('ubicación: informa GPS apagado y permiso denegado', async () => {
  const location: LocationGateway = {
    servicesEnabled: async () => false,
    getCurrent: async () => coordinates(),
    getLastKnown: async () => null,
    reverseGeocode: async () => null,
  };
  const service = createLocationService({
    location,
    permissions: grantedPermissions(),
    timeoutMs: 1000,
    now: () => 1,
  });
  assert.deepEqual(await service.getTaskLocation(), {
    status: 'unavailable',
    reason: 'Activa la ubicación (GPS) del dispositivo.',
  });

  const permissions = createPermissionService({
    camera: { check: async () => granted, request: async () => granted },
    mediaLibrary: { check: async () => granted, request: async () => granted },
    location: { check: async () => blocked, request: async () => blocked },
  }, async () => undefined);
  const deniedService = createLocationService({ location, permissions, timeoutMs: 1000, now: () => 1 });
  assert.deepEqual(await deniedService.getTaskLocation(), {
    status: 'permission-denied',
    permission: 'blocked',
  });
});
