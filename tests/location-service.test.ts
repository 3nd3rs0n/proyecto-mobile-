import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  APPROXIMATE_ACCURACY_M,
  describeLocation,
  formatAddress,
  isValidCoordinates,
  mapUrl,
} from '../src/domain/task-location';
import {
  createLocationService,
  LAST_KNOWN_MAX_AGE_MS,
  type Coordinates,
  type LocationGateway,
} from '../src/services/location-service';
import type { PermissionService } from '../src/services/permission-service';
import type { PermissionState } from '../src/types/device';

const NOW = 1_763_700_000_000;
const SANTIAGO: Coordinates = { latitude: -33.4489, longitude: -70.6693, accuracy: 12, timestamp: NOW };

type FakeGps = {
  enabled?: boolean;
  /** 'never' simula un GPS que no responde. */
  current?: Coordinates | Error | 'never';
  lastKnown?: Coordinates | null;
  address?: string | null | Error;
};

function fakeGps({
  enabled = true,
  current = SANTIAGO,
  lastKnown = null,
  address = 'Santiago, Chile',
}: FakeGps = {}) {
  const calls = { getCurrent: 0, getLastKnown: 0 };
  const location: LocationGateway = {
    servicesEnabled: async () => enabled,
    getCurrent() {
      calls.getCurrent += 1;
      if (current === 'never') return new Promise<Coordinates>(() => {});
      return current instanceof Error ? Promise.reject(current) : Promise.resolve(current);
    },
    async getLastKnown() {
      calls.getLastKnown += 1;
      return lastKnown;
    },
    async reverseGeocode() {
      if (address instanceof Error) throw address;
      return address;
    },
  };
  return { location, calls };
}

function fakePermissions(state: PermissionState = 'granted'): PermissionService {
  return {
    check: async () => state,
    ensure: async () => state,
    openSettings: async () => {},
  };
}

function serviceWith(gps: FakeGps = {}, permission: PermissionState = 'granted') {
  const { location, calls } = fakeGps(gps);
  const service = createLocationService({
    location,
    permissions: fakePermissions(permission),
    timeoutMs: 20,
    now: () => NOW,
  });
  return { service, calls };
}

test('devuelve las coordenadas, la precisión, la dirección y la hora de la lectura', async () => {
  const { service } = serviceWith();
  assert.deepEqual(await service.getTaskLocation(), {
    status: 'ok',
    value: {
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 12,
      address: 'Santiago, Chile',
      capturedAt: NOW,
    },
  });
});

test('sin permiso no usa el GPS', async () => {
  for (const state of ['denied', 'blocked'] as const) {
    const { service, calls } = serviceWith({}, state);
    assert.deepEqual(await service.getTaskLocation(), {
      status: 'permission-denied',
      permission: state,
    });
    assert.equal(calls.getCurrent, 0);
  }
});

test('con el GPS apagado informa que no está disponible', async () => {
  const { service, calls } = serviceWith({ enabled: false });
  const result = await service.getTaskLocation();
  assert.equal(result.status, 'unavailable');
  assert.equal(calls.getCurrent, 0);
});

test('si el GPS no responde a tiempo, usa la última ubicación conocida reciente', async () => {
  const recent = { ...SANTIAGO, latitude: -33.45, timestamp: NOW - 60_000 };
  const { service } = serviceWith({ current: 'never', lastKnown: recent });
  const result = await service.getTaskLocation();
  assert.ok(result.status === 'ok');
  assert.equal(result.value.latitude, -33.45);
  assert.equal(result.value.capturedAt, NOW - 60_000);
});

test('si el GPS falla, también usa la última ubicación conocida', async () => {
  const { service, calls } = serviceWith({ current: new Error('Sin señal'), lastKnown: SANTIAGO });
  assert.equal((await service.getTaskLocation()).status, 'ok');
  assert.equal(calls.getLastKnown, 1);
});

test('descarta una última ubicación demasiado antigua', async () => {
  const old = { ...SANTIAGO, timestamp: NOW - LAST_KNOWN_MAX_AGE_MS - 1 };
  const { service } = serviceWith({ current: 'never', lastKnown: old });
  assert.equal((await service.getTaskLocation()).status, 'unavailable');
});

test('sin lectura actual ni anterior informa que no está disponible', async () => {
  const { service } = serviceWith({ current: 'never', lastKnown: null });
  assert.equal((await service.getTaskLocation()).status, 'unavailable');
});

test('rechaza coordenadas fuera de rango', async () => {
  const { service } = serviceWith({ current: { ...SANTIAGO, latitude: 120 } });
  assert.equal((await service.getTaskLocation()).status, 'error');
});

test('acepta una ubicación aproximada', async () => {
  const { service } = serviceWith({ current: { ...SANTIAGO, accuracy: 3000 } });
  const result = await service.getTaskLocation();
  assert.ok(result.status === 'ok');
  assert.equal(result.value.accuracy, 3000);
});

test('si falla la dirección, guarda la ubicación sin dirección', async () => {
  for (const address of [null, new Error('Sin geocodificador')]) {
    const { service } = serviceWith({ address });
    const result = await service.getTaskLocation();
    assert.ok(result.status === 'ok');
    assert.equal(result.value.address, null);
  }
});

test('valida los límites de latitud y longitud', () => {
  assert.equal(isValidCoordinates(-33.4489, -70.6693), true);
  assert.equal(isValidCoordinates(90, 180), true);
  assert.equal(isValidCoordinates(-90.0001, 0), false);
  assert.equal(isValidCoordinates(0, 180.0001), false);
  assert.equal(isValidCoordinates(Number.NaN, 0), false);
});

test('arma la dirección sin partes vacías ni repetidas', () => {
  assert.equal(
    formatAddress(['Av. Providencia', 'Providencia', 'Santiago']),
    'Av. Providencia, Providencia, Santiago',
  );
  assert.equal(formatAddress([null, ' Santiago ', 'Santiago']), 'Santiago');
  assert.equal(formatAddress([null, '', '  ']), null);
});

test('describe la ubicación con la dirección o, si no hay, con las coordenadas', () => {
  const base = { latitude: -33.44891, longitude: -70.66931, accuracy: 12, capturedAt: NOW };
  assert.equal(describeLocation({ ...base, address: 'Santiago' }), 'Santiago');
  assert.equal(describeLocation({ ...base, address: null }), '-33.4489, -70.6693');
  assert.equal(
    describeLocation({ ...base, address: 'Santiago', accuracy: APPROXIMATE_ACCURACY_M + 1 }),
    'Santiago (aprox.)',
  );
});

test('arma el enlace al mapa de cada plataforma', () => {
  const location = { latitude: -33.4489, longitude: -70.6693, accuracy: 12, address: null, capturedAt: NOW };
  assert.equal(mapUrl(location, 'ios'), 'https://maps.apple.com/?ll=-33.4489,-70.6693');
  assert.equal(mapUrl(location, 'other'), 'geo:-33.4489,-70.6693?q=-33.4489,-70.6693');
});
