import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export type LegacyPasswordRecord = {
  algorithm: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  hash: string;
};

export type ScryptPasswordRecord = {
  algorithm: 'scrypt';
  N: number;
  r: number;
  p: number;
  salt: string;
  hash: string;
};

export type DevicePasswordRecord = {
  algorithm: 'pbkdf2-device-v1';
  iterations: 10_000;
  salt: string;
  hash: string;
};

export type PasswordRecord = LegacyPasswordRecord | ScryptPasswordRecord | DevicePasswordRecord;

export const DEVICE_KEY = 'paso-a-paso.password-key.v1';
type SecureKeyStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type MeasureAuth = <T>(phase: string, action: () => Promise<T>) => Promise<T>;

const LEGACY_ITERATIONS = 600_000;
// Perfil de OWASP: 32 MiB de memoria; evita el costo de 600.000 HMAC en JS móvil.
const SCRYPT_COST = { N: 32_768, r: 8, p: 3 } as const;
// Cede periódicamente a la UI sin pagar el costo de un temporizador por cada 10 ms.
const ASYNC_TICK_MS = 32;
// Una ventana de un cuadro amortiza los temporizadores sin cambiar el costo criptográfico.
const DEVICE_ASYNC_TICK_MS = 16;

export interface PasswordHasher {
  hash(password: string): Promise<PasswordRecord>;
  verify(password: string, record: PasswordRecord): Promise<boolean>;
  needsUpgrade(record: PasswordRecord): boolean;
}

export function isPasswordRecord(value: unknown): value is PasswordRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PasswordRecord>;
  const validEncoding = typeof record.salt === 'string' && /^[a-f0-9]{32}$/.test(record.salt) &&
    typeof record.hash === 'string' && /^[a-f0-9]{64}$/.test(record.hash);
  if (!validEncoding) return false;
  if (record.algorithm === 'pbkdf2-sha256') return record.iterations === LEGACY_ITERATIONS;
  if (record.algorithm === 'pbkdf2-device-v1') return record.iterations === 10_000;
  // Solo se aceptan perfiles conocidos para impedir costos manipulados o desmesurados.
  return record.algorithm === 'scrypt' && record.N === SCRYPT_COST.N &&
    record.r === SCRYPT_COST.r && record.p === SCRYPT_COST.p;
}

export function createPasswordHasher(
  randomBytes: (size: number) => Promise<Uint8Array>, secrets?: SecureKeyStorage,
  measure: MeasureAuth = (_phase, action) => action(),
): PasswordHasher {
  async function deviceKey(create: boolean) {
    if (!secrets) throw new Error('Se requiere almacenamiento seguro.');
    let raw = await measure('clave_lectura', () => secrets.getItem(DEVICE_KEY));
    if (raw === null && create) {
      raw = bytesToHex(await measure('clave_aleatoria', () => randomBytes(32)));
      const encoded = raw;
      await measure('clave_escritura', () => secrets.setItem(DEVICE_KEY, encoded));
    }
    // Nunca reemplaza una clave ausente o dañada al comprobar una cuenta existente.
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) throw new Error('Clave local no disponible.');
    return hexToBytes(raw);
  }
  async function deriveDevice(password: string, salt: Uint8Array, key: Uint8Array) {
    const bytes = utf8ToBytes(password);
    const keyed = hmac(sha256, key, bytes);
    try {
      return await measure('derivacion_actual', () => pbkdf2Async(sha256, keyed, salt, {
        c: 10_000, dkLen: 32, asyncTick: DEVICE_ASYNC_TICK_MS,
      }));
    } finally { key.fill(0); bytes.fill(0); keyed.fill(0); }
  }
  const derive = async (password: string, salt: Uint8Array, legacy = false) => {
    const bytes = utf8ToBytes(password);
    try {
      return legacy
        ? await measure('derivacion_pbkdf2_antigua', () => pbkdf2Async(sha256, bytes, salt, {
          c: LEGACY_ITERATIONS, dkLen: 32, asyncTick: ASYNC_TICK_MS,
        }))
        : await measure('derivacion_scrypt_antigua', () => scryptAsync(bytes, salt, {
          ...SCRYPT_COST, dkLen: 32, asyncTick: ASYNC_TICK_MS, maxmem: 36 * 1024 * 1024,
        }));
    } finally { bytes.fill(0); }
  };
  return {
    needsUpgrade: (record) => secrets ? record.algorithm !== 'pbkdf2-device-v1' : record.algorithm === 'pbkdf2-sha256',
    async hash(password) {
      // Sal y clave son independientes; no se conservan secretos en una caché.
      const [salt, key] = await Promise.all([
        measure('sal_aleatoria', () => randomBytes(16)),
        secrets ? measure('clave_obtencion', () => deviceKey(true)) : Promise.resolve(null),
      ]);
      const hash = key ? await deriveDevice(password, salt, key) : await derive(password, salt);
      try {
        if (secrets) return { algorithm: 'pbkdf2-device-v1', iterations: 10_000, salt: bytesToHex(salt), hash: bytesToHex(hash) };
        return { algorithm: 'scrypt', ...SCRYPT_COST, salt: bytesToHex(salt), hash: bytesToHex(hash) };
      } finally { hash.fill(0); }
    },
    async verify(password, record) {
      if (!isPasswordRecord(record)) return false;
      const candidate = record.algorithm === 'pbkdf2-device-v1'
        ? await deriveDevice(password, hexToBytes(record.salt), await measure('clave_obtencion', () => deviceKey(false)))
        : await derive(password, hexToBytes(record.salt), record.algorithm === 'pbkdf2-sha256');
      try {
        const expected = hexToBytes(record.hash);
        let difference = 0;
        for (let index = 0; index < expected.length; index++) difference |= candidate[index] ^ expected[index];
        return difference === 0;
      }
      finally { candidate.fill(0); }
    },
  };
}
