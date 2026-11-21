import { isPasswordRecord, type PasswordHasher, type PasswordRecord } from './password';
import type { KeyValueStorage } from '../repositories/storage-task-repository';

const now = () => globalThis.performance?.now() ?? Date.now();
let diagnosticsEnabled = false;
let traceNumber = 0;
let trace: { id: number; operation: string; start: number; marks: Set<string> } | null = null;

// Diagnóstico temporal, desactivado por defecto: solo etiquetas constantes y milisegundos.
export const authTiming = {
  enable(enabled: boolean) { diagnosticsEnabled = enabled; trace = null; },
  start(operation: 'registro' | 'login' | 'restaurar' | 'logout') {
    trace = diagnosticsEnabled ? { id: ++traceNumber, operation, start: now(), marks: new Set() } : null;
    if (trace) console.info('[auth-perf]', JSON.stringify({
      id: trace.id, operation, phase: 'inicio',
      engine: 'HermesInternal' in globalThis ? 'Hermes' :
        typeof process !== 'undefined' && process.versions?.node ? 'Node' : 'JavaScript',
    }));
  },
  mark(phase: string) {
    if (!trace || trace.marks.has(phase)) return;
    trace.marks.add(phase);
    console.info('[auth-perf]', JSON.stringify({
      id: trace.id, operation: trace.operation, phase, kind: 'desde_inicio', ms: +(now() - trace.start).toFixed(2),
    }));
  },
  async measure<T>(phase: string, action: () => Promise<T>): Promise<T> {
    const current = trace;
    if (!current) return action();
    const start = now();
    let ok = false;
    try { const value = await action(); ok = true; return value; }
    finally {
      console.info('[auth-perf]', JSON.stringify({
        id: current.id, operation: current.operation, phase, kind: 'duracion', ok,
        ms: +(now() - start).toFixed(2), desdeInicioMs: +(now() - current.start).toFixed(2),
      }));
    }
  },
};

export type User = { id: string; name: string; email: string };

export type Registration = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
};

export class AuthError extends Error {}

export interface SecretStorage extends KeyValueStorage {
  removeItem(key: string): Promise<void>;
}

export const USERS_KEY = 'paso-a-paso.users.v1';
export const SESSION_KEY = 'paso-a-paso.session.v1';
export const credentialKey = (id: string) => `paso-a-paso.credential.${id}`;
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value);
function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as User;
  return validId(user.id) && typeof user.name === 'string' && user.name.trim().length > 0 &&
    typeof user.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
}

export function validateRegistration(input: Registration) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email || !input.password.trim() || !input.confirmation.trim())
    throw new AuthError('Completa todos los campos.');
  if (name.length > 80 || email.length > 254) throw new AuthError('El nombre o correo es demasiado largo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('Ingresa un correo electrónico válido.');
  if (input.password.length < 8) throw new AuthError('La contraseña debe tener al menos 8 caracteres.');
  if (input.password.length > 128) throw new AuthError('La contraseña debe tener como máximo 128 caracteres.');
  if (input.password !== input.confirmation) throw new AuthError('Las contraseñas no coinciden.');
  return { name, email };
}

export function createAuthService(
  storage: KeyValueStorage, secrets: SecretStorage, passwords: PasswordHasher, createId: () => string,
) {
  const listUsers = async (): Promise<User[]> => {
    const raw = await authTiming.measure('usuarios_lectura', () => storage.getItem(USERS_KEY));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isUser) ||
      new Set(parsed.map((user) => user.id)).size !== parsed.length ||
      new Set(parsed.map((user) => user.email)).size !== parsed.length) {
      throw new Error('El registro local de cuentas está dañado.');
    }
    return parsed;
  };
  async function readAccount(user: User): Promise<PasswordRecord | null> {
    const raw = await authTiming.measure('credencial_lectura', () => secrets.getItem(credentialKey(user.id)));
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.user?.id === user.id && parsed.user.email === user.email &&
        parsed.user.name === user.name && isPasswordRecord(parsed.password) ? parsed.password : null;
    } catch { return null; }
  }
  async function addAccount(user: User, password: PasswordRecord, users: User[]) {
    // El servicio serializa registros; la credencial se escribe antes de publicar la cuenta.
    await authTiming.measure('credencial_escritura', () =>
      secrets.setItem(credentialKey(user.id), JSON.stringify({ user, password })));
    try {
      await authTiming.measure('usuarios_escritura', () => storage.setItem(USERS_KEY, JSON.stringify([...users, user])));
    } catch (failure) {
      // Mejor esfuerzo: una credencial huérfana nunca permite acceder sin perfil publicado.
      await secrets.removeItem(credentialKey(user.id)).catch(() => undefined);
      throw failure;
    }
  }
  async function updatePassword(user: User, password: PasswordRecord) {
    if (!isPasswordRecord(password)) throw new Error('Formato de credencial inválido.');
    // El perfil ya fue validado en esta cola; no se vuelve a consultar ni se cambia su UUID.
    await authTiming.measure('migracion_escritura', () =>
      secrets.setItem(credentialKey(user.id), JSON.stringify({ user, password })));
  }
  async function readSession(): Promise<string | null> {
    const raw = await authTiming.measure('sesion_lectura', () => secrets.getItem(SESSION_KEY));
    if (raw === null) return null;
    try {
      const value = JSON.parse(raw);
      if (value?.version === 1 && validId(value.userId)) return value.userId;
    } catch { /* Una sesión corrupta se elimina, sin tocar cuentas ni tareas. */ }
    await secrets.removeItem(SESSION_KEY);
    return null;
  }
  async function saveSession(user: User) {
    await authTiming.measure('sesion_escritura', () =>
      secrets.setItem(SESSION_KEY, JSON.stringify({ version: 1, userId: user.id })));
  }
  const clearSession = () => secrets.removeItem(SESSION_KEY);

  let currentUser: User | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };
  let restoring: Promise<User | null> | null = null;
  const restore = () => {
    if (restoring) return restoring;
    const result = authTiming.measure('servicio_total', () => serial(async () => {
      currentUser = null;
      const id = await readSession();
      if (!id) return null;
      const users = await listUsers();
      const user = users.find((item) => item.id === id);
      if (!user || !await readAccount(user)) {
        await clearSession();
        return null;
      }
      currentUser = user;
      return user;
    }));
    restoring = result;
    const clear = () => { restoring = null; };
    void result.then(clear, clear);
    return result;
  };
  return {
    getUser: () => currentUser,
    register: (input: Registration) => authTiming.measure('servicio_total', () => serial(async () => {
      const profile = await authTiming.measure('validacion', async () => validateRegistration(input));
      const users = await listUsers();
      if (users.some((user) => user.email === profile.email))
        throw new AuthError('Ya existe una cuenta con ese correo en este dispositivo.');
      const user = { ...profile, id: await authTiming.measure('uuid', async () => createId()) };
      await addAccount(user, await authTiming.measure('hash_total', () => passwords.hash(input.password)), users);
      // El registro conduce al login; un fallo de sesión no deja un registro ambiguo.
      return user;
    })),
    login: (email: string, password: string) => authTiming.measure('servicio_total', () => serial(async () => {
      const normalizedEmail = await authTiming.measure('validacion', async () => {
        if (!email.trim() || !password.trim()) throw new AuthError('Completa el correo y la contraseña.');
        if (password.length > 128) throw new AuthError('Correo o contraseña incorrectos.');
        return email.trim().toLowerCase();
      });
      const user = (await listUsers()).find((item) => item.email === normalizedEmail);
      const credential = user ? await readAccount(user) : null;
      if (!user || !credential || !await authTiming.measure('verificacion_total', () => passwords.verify(password, credential)))
        throw new AuthError('Correo o contraseña incorrectos.');
      await saveSession(user);
      currentUser = user;
      if (passwords.needsUpgrade(credential)) {
        // La sesión ya está persistida. La migración opcional no retrasa la pantalla principal.
        // Sigue en la misma cola para evitar carreras con registros y cierres posteriores.
        void serial(async () => {
          await authTiming.measure('migracion_total', async () => updatePassword(user, await passwords.hash(password)));
        }).catch(() => { /* Se conserva la credencial anterior y se reintenta en otro login. */ });
      }
      return user;
    })),
    restore,
    logout: () => serial(async () => {
      await clearSession();
      currentUser = null;
    }),
  };
}
