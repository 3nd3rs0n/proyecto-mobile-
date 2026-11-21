import type { PermissionState } from '../types/device';

export type PermissionKind = 'camera' | 'mediaLibrary' | 'location';

/** Igual a lo que devuelven las librerías de Expo. */
export type PermissionResponse = { granted: boolean; canAskAgain: boolean };

export interface PermissionGateway {
  check(): Promise<PermissionResponse>;
  request(): Promise<PermissionResponse>;
}

export interface PermissionService {
  check(kind: PermissionKind): Promise<PermissionState>;
  /** Pregunta solo si no hay permiso y se puede preguntar. Si está bloqueado, no pregunta. */
  ensure(kind: PermissionKind): Promise<PermissionState>;
  openSettings(): Promise<void>;
}

export type PermissionGatewayMap = Record<PermissionKind, PermissionGateway>;

const toState = (response: PermissionResponse): PermissionState =>
  response.granted ? 'granted' : response.canAskAgain ? 'denied' : 'blocked';

export function createPermissionService(
  gateways: PermissionGatewayMap,
  openSettings: () => Promise<void>,
): PermissionService {
  return {
    async check(kind) {
      return toState(await gateways[kind].check());
    },
    async ensure(kind) {
      const gateway = gateways[kind];
      const current = await gateway.check();
      if (current.granted) return 'granted';
      if (!current.canAskAgain) return 'blocked';
      return toState(await gateway.request());
    },
    openSettings,
  };
}
