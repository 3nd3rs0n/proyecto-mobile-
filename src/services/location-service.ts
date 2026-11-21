import { isValidCoordinates } from '../domain/task-location';
import type { DeviceResult } from '../types/device';
import type { TaskLocation } from '../types/task';
import type { PermissionService } from './permission-service';

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  /** Momento de la lectura según el GPS (milisegundos desde 1970). */
  timestamp: number;
};

export interface LocationGateway {
  /** false si el GPS está apagado. */
  servicesEnabled(): Promise<boolean>;
  getCurrent(): Promise<Coordinates>;
  getLastKnown(): Promise<Coordinates | null>;
  reverseGeocode(coordinates: Coordinates): Promise<string | null>;
}

export type LocationServiceDeps = {
  location: LocationGateway;
  permissions: PermissionService;
  timeoutMs: number;
  now: () => number;
};

/**
 * Si el GPS tarda más de timeoutMs o falla, usa la última ubicación conocida si es reciente.
 * Si falla la dirección, la ubicación se guarda igual con address: null.
 */
export interface LocationService {
  getTaskLocation(): Promise<DeviceResult<TaskLocation>>;
}

/** Una ubicación anterior a esto ya no representa dónde se creó la tarea. */
export const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createLocationService({
  location,
  permissions,
  timeoutMs,
  now,
}: LocationServiceDeps): LocationService {
  const readCoordinates = async () => {
    const current = await withTimeout(location.getCurrent(), timeoutMs).catch(() => null);
    if (current) return current;

    const lastKnown = await location.getLastKnown();
    return lastKnown && now() - lastKnown.timestamp <= LAST_KNOWN_MAX_AGE_MS ? lastKnown : null;
  };

  const readAddress = (coordinates: Coordinates) =>
    location.reverseGeocode(coordinates).catch(() => null);

  return {
    async getTaskLocation() {
      try {
        // Va antes del permiso: con la localización apagada, iOS informa el permiso como denegado.
        if (!(await location.servicesEnabled())) {
          return { status: 'unavailable', reason: 'La ubicación del teléfono está desactivada.' };
        }

        const permission = await permissions.ensure('location');
        if (permission !== 'granted') return { status: 'permission-denied', permission };

        const coordinates = await readCoordinates();
        if (!coordinates) {
          return { status: 'unavailable', reason: 'No se pudo obtener la ubicación a tiempo.' };
        }
        if (!isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
          return { status: 'error', message: 'El GPS entregó coordenadas inválidas.' };
        }

        return {
          status: 'ok',
          value: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            accuracy: coordinates.accuracy,
            address: await readAddress(coordinates),
            capturedAt: coordinates.timestamp,
          },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudo obtener la ubicación',
        };
      }
    },
  };
}
