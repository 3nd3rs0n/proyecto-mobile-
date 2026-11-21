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
