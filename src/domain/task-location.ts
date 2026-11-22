import type { TaskLocation } from '../types/task';

export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** Une las partes de una dirección sin vacíos ni repetidos: "Av. Providencia, Providencia, Santiago". */
export function formatAddress(parts: readonly (string | null)[]): string | null {
  const clean = parts.map((part) => part?.trim()).filter((part): part is string => !!part);
  const unique = [...new Set(clean)];
  return unique.length > 0 ? unique.join(', ') : null;
}

/** Sobre esta precisión (en metros) la ubicación se muestra como aproximada. */
export const APPROXIMATE_ACCURACY_M = 500;

export function describeLocation({ latitude, longitude, accuracy, address }: TaskLocation): string {
  const place = address ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  return accuracy != null && accuracy > APPROXIMATE_ACCURACY_M ? `${place} (aprox.)` : place;
}

export function mapUrl({ latitude, longitude }: TaskLocation, platform: 'ios' | 'other'): string {
  return platform === 'ios'
    ? `https://maps.apple.com/?ll=${latitude},${longitude}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
}
