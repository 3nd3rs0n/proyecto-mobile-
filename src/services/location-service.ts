import type { DeviceResult } from '../types/device';
import type { TaskLocation } from '../types/task';
import type { PermissionService } from './permission-service';

export type Coordinates = Omit<TaskLocation, 'address'> & { accuracy: number | null };

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
 * Si el GPS tarda más de timeoutMs, usa la última ubicación conocida.
 * Si falla la dirección, la ubicación se guarda igual con address: null.
 */
export interface LocationService {
  getTaskLocation(): Promise<DeviceResult<TaskLocation>>;
}

async function resolveWithin(
  primary: () => Promise<Coordinates>,
  timeoutMs: number,
  fallback: () => Promise<Coordinates | null>,
): Promise<Coordinates | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const result = await Promise.race([primary().catch(() => null), timeout]);
    if (result) return result;
    return await fallback().catch(() => null);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function createLocationService({ location, permissions, timeoutMs, now }: LocationServiceDeps): LocationService {
  return {
    async getTaskLocation() {
      try {
        const permission = await permissions.ensure('location');
        if (permission !== 'granted') return { status: 'permission-denied', permission };

        if (!await location.servicesEnabled())
          return { status: 'unavailable', reason: 'Activa la ubicación (GPS) del dispositivo.' };

        const coordinates = await resolveWithin(
          () => location.getCurrent(),
          timeoutMs,
          () => location.getLastKnown(),
        );
        if (!coordinates)
          return { status: 'unavailable', reason: 'No se pudo obtener la ubicación.' };

        let address: string | null = null;
        try {
          address = await location.reverseGeocode(coordinates);
        } catch {
          address = null;
        }

        return {
          status: 'ok',
          value: { ...coordinates, address, capturedAt: coordinates.capturedAt ?? now() },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudo obtener la ubicación.',
        };
      }
    },
  };
}
