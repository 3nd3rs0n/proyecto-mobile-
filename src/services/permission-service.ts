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

export type PermissionServiceDeps = {
  gateways: Record<PermissionKind, PermissionGateway>;
  openSettings: () => Promise<void>;
};

export function toPermissionState({ granted, canAskAgain }: PermissionResponse): PermissionState {
  if (granted) return 'granted';
  return canAskAgain ? 'denied' : 'blocked';
}

export function createPermissionService({
  gateways,
  openSettings,
}: PermissionServiceDeps): PermissionService {
  return {
    async check(kind) {
      try {
        return toPermissionState(await gateways[kind].check());
      } catch {
        return 'denied';
      }
    },
    async ensure(kind) {
      try {
        const current = toPermissionState(await gateways[kind].check());
        if (current !== 'denied') return current;
        return toPermissionState(await gateways[kind].request());
      } catch {
        return 'denied';
      }
    },
    openSettings,
  };
}
