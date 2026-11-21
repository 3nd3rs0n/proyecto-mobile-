import { strict as assert } from 'node:assert';
import { createHmac, pbkdf2Sync, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { test } from 'node:test';

import { authTiming, createAuthService, validateRegistration, credentialKey, SESSION_KEY, USERS_KEY, type SecretStorage, type Registration } from '../src/domain/auth-service';
import { createPasswordHasher, DEVICE_KEY, isPasswordRecord } from '../src/domain/password';
import type { LegacyPasswordRecord } from '../src/domain/password';

function memory(): SecretStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}
const passwords = createPasswordHasher(async (size) => randomBytes(size));
const registration: Registration = {
  name: '  Diego  ', email: ' DIEGO@example.com ', password: 'Prueba-2026!', confirmation: 'Prueba-2026!',
};

test('derivación local con clave segura coincide con Node Crypto y conserva sal individual', async () => {
  const secrets = memory();
  const fast = createPasswordHasher(async (size) => randomBytes(size), secrets);
  const record = await fast.hash(registration.password);
  assert.equal(record.algorithm, 'pbkdf2-device-v1');
  const key = Buffer.from(secrets.values.get(DEVICE_KEY)!, 'hex');
  const keyed = createHmac('sha256', key).update(registration.password).digest();
  assert.equal(record.hash, pbkdf2Sync(keyed, Buffer.from(record.salt, 'hex'), 10_000, 32, 'sha256').toString('hex'));
  assert.notEqual((await fast.hash(registration.password)).salt, record.salt);
  assert.equal(await fast.verify(registration.password, record), true);
  assert.equal(await fast.verify('incorrecta', record), false);
  assert.equal(fast.needsUpgrade(record), false);
  assert.equal(isPasswordRecord({ ...record, iterations: 1 }), false);
});

test('la clave segura no se recrea si falta o está dañada al verificar', async () => {
  const secrets = memory();
  const fast = createPasswordHasher(async (size) => randomBytes(size), secrets);
  const record = await fast.hash(registration.password);
  secrets.values.delete(DEVICE_KEY);
  await assert.rejects(fast.verify(registration.password, record), /Clave local/);
  assert.equal(secrets.values.has(DEVICE_KEY), false);
  secrets.values.set(DEVICE_KEY, 'dañada');
  await assert.rejects(fast.verify(registration.password, record), /Clave local/);
  assert.equal(secrets.values.get(DEVICE_KEY), 'dañada');
});

test('registro, login, reinicio y logout usan la derivación rápida sin secretos en AsyncStorage', async () => {
  const storage = memory();
  const secrets = memory();
  const service = () => createAuthService(storage, secrets,
    createPasswordHasher(async (size) => randomBytes(size), secrets), randomUUID);
  const auth = service();
  const user = await auth.register(registration);
  await auth.login(user.email, registration.password);
  const restarted = service();
  assert.deepEqual(await restarted.restore(), user);
  await restarted.logout();
  await assert.rejects(restarted.login(user.email, 'incorrecta'), /incorrectos/);
  assert.deepEqual(await restarted.login(user.email, registration.password), user);
  assert.equal(storage.values.has(DEVICE_KEY), false);
  assert.deepEqual([...storage.values.keys()], [USERS_KEY]);
});

test('migra scrypt a la derivación local tras login válido sin modificar las tareas', async () => {
  const storage = memory();
  const secrets = memory();
  const old = createAuthService(storage, secrets, passwords, randomUUID);
  const user = await old.register(registration);
  const tasksKey = `paso-a-paso.tasks.user.${user.id}`;
  const saved = '[{"id":"conservar","userId":"original"}]';
  storage.values.set(tasksKey, saved);
  const auth = createAuthService(storage, secrets,
    createPasswordHasher(async (size) => randomBytes(size), secrets), randomUUID);
  await assert.rejects(auth.login(user.email, 'incorrecta'), /incorrectos/);
  assert.equal(JSON.parse(secrets.values.get(credentialKey(user.id))!).password.algorithm, 'scrypt');
  assert.deepEqual(await auth.login(user.email, registration.password), user);
  await auth.logout(); // La cola espera la migración opcional antes de cerrar.
  assert.equal(JSON.parse(secrets.values.get(credentialKey(user.id))!).password.algorithm, 'pbkdf2-device-v1');
  assert.equal(storage.values.get(tasksKey), saved);
  await auth.login(user.email, registration.password);
});
function setup() {
  const storage = memory();
  const secrets = memory();
  const service = createAuthService(storage, secrets, passwords, randomUUID);
  return { storage, secrets, service };
}

test('scrypt real coincide con Node Crypto y usa sal aleatoria por contraseña', async () => {
  const first = await passwords.hash(registration.password);
  const second = await passwords.hash(registration.password);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.ok(first.algorithm === 'scrypt');
  assert.deepEqual([first.N, first.r, first.p], [32_768, 8, 3]);
  const expected = scryptSync(registration.password, Buffer.from(first.salt, 'hex'), 32, {
    N: 32_768, r: 8, p: 3, maxmem: 36 * 1024 * 1024,
  }).toString('hex');
  assert.equal(first.hash, expected);
  assert.equal(await passwords.verify(registration.password, first), true);
  assert.equal(await passwords.verify('incorrecta', first), false);
  assert.equal(await passwords.verify('incorrecta', { ...first, N: 2 ** 24 }), false);
});

test('registro normaliza perfil y guarda solo perfil en AsyncStorage; credencial derivada en almacén seguro', async () => {
  const { service, storage, secrets } = setup();
  const user = await service.register(registration);
  assert.equal(user.name, 'Diego');
  assert.equal(user.email, 'diego@example.com');
  assert.match(user.id, /^[a-f0-9-]{36}$/);
  assert.equal(service.getUser(), null);
  assert.deepEqual(JSON.parse(storage.values.get(USERS_KEY)!), [user]);
  const secureRecord = secrets.values.get(credentialKey(user.id))!;
  assert.ok(secureRecord.includes('scrypt'));
  assert.equal(secureRecord.includes(registration.password), false);
  assert.equal([...storage.values.values()].some((value) => /password|hash|salt/.test(value)), false);
});

test('validaciones: todos los campos obligatorios, correo, longitud y confirmación', () => {
  for (const field of ['name', 'email', 'password', 'confirmation']) {
    assert.throws(() => validateRegistration({ ...registration, [field]: '  ' }), /Completa/);
  }
  assert.throws(() => validateRegistration({ ...registration, email: 'sin-arroba' }), /correo/);
  assert.throws(() => validateRegistration({ ...registration, password: '1234567', confirmation: '1234567' }), /8 caracteres/);
  assert.throws(() => validateRegistration({ ...registration, confirmation: 'Distinta-123' }), /coinciden/);
  assert.throws(() => validateRegistration({ ...registration, password: 'x'.repeat(129) }), /128/);
});

test('rechaza duplicados incluso con mayúsculas, espacios y registros simultáneos', async () => {
  const { service, storage, secrets } = setup();
  const results = await Promise.allSettled([
    service.register(registration), service.register({ ...registration, email: 'diego@example.com' }),
  ]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.equal((JSON.parse(storage.values.get(USERS_KEY)!)).length, 1);
  await assert.rejects(service.register(registration), /Ya existe/);
});

test('login, reinicio del servicio, recuperación y logout persistido', async () => {
  const { service, secrets, storage } = setup();
  const user = await service.register(registration);
  assert.deepEqual(await service.login(' DIEGO@example.com ', registration.password), user);
  assert.equal(JSON.parse(secrets.values.get(SESSION_KEY)!).userId, user.id);
  const restarted = createAuthService(storage, secrets, passwords, randomUUID);
  assert.deepEqual(await restarted.restore(), user);
  await restarted.logout();
  assert.equal(restarted.getUser(), null);
  assert.equal(secrets.values.has(SESSION_KEY), false);
  assert.equal(await createAuthService(storage, secrets, passwords, randomUUID).restore(), null);
});

test('login rechaza vacíos y da el mismo mensaje para usuario inexistente o contraseña incorrecta', async () => {
  const { service, secrets } = setup();
  await service.register(registration);
  await assert.rejects(service.login('', '12345678'), /Completa/);
  await assert.rejects(service.login('diego@example.com', ''), /Completa/);
  for (const email of ['diego@example.com', 'otra@example.com']) {
    await assert.rejects(service.login(email, 'incorrecta'), { message: 'Correo o contraseña incorrectos.' });
  }
  assert.equal(service.getUser(), null);
  assert.equal(secrets.values.has(SESSION_KEY), false);
});

test('elimina sesiones corruptas, con versión desconocida o usuario inexistente', async () => {
  for (const raw of ['{bad', 'null', '{}', '{"version":2,"userId":"unknown"}', '{"version":1,"userId":"unknown"}']) {
    const { service, secrets } = setup();
    secrets.values.set(SESSION_KEY, raw);
    assert.equal(await service.restore(), null);
    assert.equal(secrets.values.has(SESSION_KEY), false);
  }
});

test('invalida sesión cuando falta o está dañada la credencial del usuario', async () => {
  const { service, secrets } = setup();
  const user = await service.register(registration);
  await service.login(user.email, registration.password);
  secrets.values.set(credentialKey(user.id), '{bad');
  assert.equal(await service.restore(), null);
  assert.equal(secrets.values.has(SESSION_KEY), false);
  await assert.rejects(service.login(user.email, registration.password), /incorrectos/);
});

test('no inicia sesión si SecureStore no logra persistirla; logout fallido conserva estado recuperable', async () => {
  const { service, secrets } = setup();
  await service.register(registration);
  const write = secrets.setItem;
  secrets.setItem = async () => { throw new Error('almacén bloqueado'); };
  await assert.rejects(service.login('diego@example.com', registration.password), /bloqueado/);
  assert.equal(service.getUser(), null);
  secrets.setItem = write;
  const user = await service.login('diego@example.com', registration.password);
  const remove = secrets.removeItem;
  secrets.removeItem = async () => { throw new Error('no se pudo borrar'); };
  await assert.rejects(service.logout());
  assert.deepEqual(service.getUser(), user);
  secrets.removeItem = remove;
  await service.logout();
  assert.equal(service.getUser(), null);
});

test('cuentas corruptas no se sobrescriben al registrar y errores de lectura no borran la sesión', async () => {
  const { service, storage, secrets } = setup();
  storage.values.set(USERS_KEY, '{bad');
  await assert.rejects(service.register(registration));
  assert.equal(storage.values.get(USERS_KEY), '{bad');
  secrets.values.set(SESSION_KEY, '{"version":1,"userId":"exists"}');
  await assert.rejects(service.restore());
  assert.equal(secrets.values.has(SESSION_KEY), true);
  assert.equal(service.getUser(), null);
});

function legacyCredential(): LegacyPasswordRecord {
  const salt = randomBytes(16);
  return {
    algorithm: 'pbkdf2-sha256', iterations: 600_000, salt: salt.toString('hex'),
    hash: pbkdf2Sync(registration.password, salt, 600_000, 32, 'sha256').toString('hex'),
  };
}

test('la primera entrada de una cuenta PBKDF2 migra a scrypt sin cambiar usuario ni tareas', async () => {
  const { service, storage, secrets } = setup();
  const user = { id: 'legacy-user', name: 'Diego', email: 'diego@example.com' };
  storage.values.set(USERS_KEY, JSON.stringify([user]));
  secrets.values.set(credentialKey(user.id), JSON.stringify({ user, password: legacyCredential() }));
  const tasksKey = `paso-a-paso.tasks.user.${user.id}`;
  const tasks = JSON.stringify([{ id: 'task-1', userId: user.id, title: 'Conservar' }]);
  storage.values.set(tasksKey, tasks);
  assert.deepEqual(await service.login(user.email, registration.password), user);
  await service.logout();
  assert.equal((JSON.parse(secrets.values.get(credentialKey(user.id))!).password)?.algorithm, 'scrypt');
  assert.equal(storage.values.get(tasksKey), tasks);
  assert.deepEqual(JSON.parse(storage.values.get(USERS_KEY)!), [user]);
  assert.deepEqual(await service.login(user.email, registration.password), user);
});

test('una contraseña incorrecta no migra ni altera una credencial antigua', async () => {
  const { service, storage, secrets } = setup();
  const user = { id: 'legacy-user', name: 'Diego', email: 'diego@example.com' };
  const credential = legacyCredential();
  storage.values.set(USERS_KEY, JSON.stringify([user]));
  secrets.values.set(credentialKey(user.id), JSON.stringify({ user, password: credential }));
  await assert.rejects(service.login(user.email, 'incorrecta'), /incorrectos/);
  assert.deepEqual(JSON.parse(secrets.values.get(credentialKey(user.id))!).password, credential);
  assert.equal(isPasswordRecord({ ...credential, iterations: 1 }), false);
});

test('si falla la migración se conserva la cuenta válida y puede migrarse en el próximo login', async () => {
  const { service, storage, secrets } = setup();
  const user = { id: 'legacy-user', name: 'Diego', email: 'diego@example.com' };
  const original = legacyCredential();
  storage.values.set(USERS_KEY, JSON.stringify([user]));
  secrets.values.set(credentialKey(user.id), JSON.stringify({ user, password: original }));
  const write = secrets.setItem;
  secrets.setItem = async (key, value) => {
    if (key === credentialKey(user.id)) throw new Error('escritura temporalmente bloqueada');
    return write(key, value);
  };
  assert.deepEqual(await service.login(user.email, registration.password), user);
  await service.logout();
  assert.deepEqual(JSON.parse(secrets.values.get(credentialKey(user.id))!).password, original);
  secrets.setItem = write;
  await service.login(user.email, registration.password);
  await service.logout();
  assert.equal((JSON.parse(secrets.values.get(credentialKey(user.id))!).password)?.algorithm, 'scrypt');
});

test('formato actual: una lectura de usuarios y una derivación por operación; restaurar no deriva', async () => {
  const storage = memory();
  const secrets = memory();
  const originalRead = storage.getItem;
  let reads = 0, hashes = 0, verifies = 0;
  storage.getItem = async (key) => { reads++; return originalRead(key); };
  const real = createPasswordHasher(async (size) => randomBytes(size), secrets);
  const measured = {
    needsUpgrade: real.needsUpgrade,
    hash: async (password: string) => { hashes++; return real.hash(password); },
    verify: async (password: string, record: Parameters<typeof real.verify>[1]) => {
      verifies++; return real.verify(password, record);
    },
  };
  const auth = createAuthService(storage, secrets, measured, randomUUID);
  const user = await auth.register(registration);
  assert.deepEqual({ reads, hashes, verifies }, { reads: 1, hashes: 1, verifies: 0 });
  reads = 0;
  await auth.login(user.email, registration.password);
  assert.deepEqual({ reads, hashes, verifies }, { reads: 1, hashes: 1, verifies: 1 });
  const [first, second] = await Promise.all([auth.restore(), auth.restore()]);
  assert.equal(first, second);
  assert.deepEqual({ reads, hashes, verifies }, { reads: 2, hashes: 1, verifies: 1 });
  reads = 0;
  await assert.rejects(auth.login(user.email, 'x'.repeat(129)), /incorrectos/);
  assert.equal(reads, 0);
});

test('un registro no se confirma hasta publicar el índice; un fallo revierte la credencial', async () => {
  const storage = memory();
  const secrets = memory();
  const real = createPasswordHasher(async (size) => randomBytes(size), secrets);
  const auth = createAuthService(storage, secrets, real, randomUUID);
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const writing = new Promise<void>((resolve) => { started = resolve; });
  const write = storage.setItem;
  storage.setItem = async (key, value) => { started(); await gate; return write(key, value); };
  let confirmed = false;
  const registering = auth.register(registration).then((user) => { confirmed = true; return user; });
  await writing;
  assert.equal(confirmed, false);
  assert.equal(auth.getUser(), null);
  release();
  const user = await registering;
  assert.deepEqual(JSON.parse(storage.values.get(USERS_KEY)!), [user]);

  const freshStorage = memory(), freshSecrets = memory();
  freshStorage.setItem = async () => { throw new Error('índice bloqueado'); };
  const failing = createAuthService(freshStorage, freshSecrets,
    createPasswordHasher(async (size) => randomBytes(size), freshSecrets), randomUUID);
  await assert.rejects(failing.register(registration), /bloqueado/);
  assert.equal([...freshSecrets.values.keys()].some((key) => key.startsWith('paso-a-paso.credential.')), false);
  assert.equal(freshStorage.values.has(USERS_KEY), false);
});

test('el acceso espera la sesión segura y no espera la migración opcional; la cola protege el cierre', async () => {
  const storage = memory(), secrets = memory();
  const user = { id: 'legacy-user', name: 'Diego', email: 'diego@example.com' };
  const oldRecord = legacyCredential();
  storage.values.set(USERS_KEY, JSON.stringify([user]));
  secrets.values.set(credentialKey(user.id), JSON.stringify({ user, password: oldRecord }));
  const real = createPasswordHasher(async (size) => randomBytes(size), secrets);
  let releaseSession!: () => void, sessionStarted!: () => void, releaseMigration!: () => void;
  const sessionGate = new Promise<void>((resolve) => { releaseSession = resolve; });
  const sessionWriting = new Promise<void>((resolve) => { sessionStarted = resolve; });
  const migrationGate = new Promise<void>((resolve) => { releaseMigration = resolve; });
  const write = secrets.setItem;
  secrets.setItem = async (key, value) => {
    if (key === SESSION_KEY) { sessionStarted(); await sessionGate; }
    return write(key, value);
  };
  const auth = createAuthService(storage, secrets, {
    needsUpgrade: real.needsUpgrade,
    verify: real.verify,
    hash: async (password) => { await migrationGate; return real.hash(password); },
  }, randomUUID);
  let confirmed = false;
  const entering = auth.login(user.email, registration.password).then((value) => { confirmed = true; return value; });
  await sessionWriting;
  assert.equal(confirmed, false);
  assert.equal(auth.getUser(), null);
  releaseSession();
  assert.deepEqual(await entering, user);
  assert.equal(JSON.parse(secrets.values.get(SESSION_KEY)!).userId, user.id);
  assert.deepEqual(JSON.parse(secrets.values.get(credentialKey(user.id))!).password, oldRecord);
  let closed = false;
  const closing = auth.logout().then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  releaseMigration();
  await closing;
  assert.equal(auth.getUser(), null);
  assert.equal(secrets.values.has(SESSION_KEY), false);
  assert.equal(JSON.parse(secrets.values.get(credentialKey(user.id))!).password.algorithm, 'pbkdf2-device-v1');
});

test('una sesión que no logra guardarse no inicia una migración ni publica usuario', async () => {
  const storage = memory(), secrets = memory();
  const user = { id: 'legacy-user', name: 'Diego', email: 'diego@example.com' };
  const credential = legacyCredential();
  storage.values.set(USERS_KEY, JSON.stringify([user]));
  secrets.values.set(credentialKey(user.id), JSON.stringify({ user, password: credential }));
  const real = createPasswordHasher(async (size) => randomBytes(size), secrets);
  let hashes = 0;
  const auth = createAuthService(storage, secrets, {
    needsUpgrade: real.needsUpgrade, verify: real.verify,
    hash: async (password) => { hashes++; return real.hash(password); },
  }, randomUUID);
  const write = secrets.setItem;
  secrets.setItem = async (key, value) => {
    if (key === SESSION_KEY) throw new Error('sesión bloqueada');
    return write(key, value);
  };
  await assert.rejects(auth.login(user.email, registration.password), /bloqueada/);
  assert.equal(hashes, 0);
  assert.equal(auth.getUser(), null);
  assert.deepEqual(JSON.parse(secrets.values.get(credentialKey(user.id))!).password, credential);
});

test('diagnóstico desactivado es silencioso y activado mide etapas sin datos privados', async (context) => {
  const events: string[] = [];
  context.mock.method(console, 'info', (...items: unknown[]) => { events.push(items.join(' ')); });
  const storage = memory(), secrets = memory();
  const auth = createAuthService(storage, secrets,
    createPasswordHasher(async (size) => randomBytes(size), secrets, authTiming.measure), randomUUID);
  try {
    authTiming.enable(false);
    authTiming.start('restaurar');
    await auth.restore();
    assert.equal(events.length, 0);
    authTiming.enable(true);
    authTiming.start('registro');
    const user = await auth.register(registration);
    authTiming.start('login');
    await auth.login(user.email, registration.password);
    const report = events.join('\n');
    for (const phase of ['validacion', 'usuarios_lectura', 'credencial_lectura', 'clave_lectura', 'uuid',
      'sal_aleatoria', 'derivacion_actual', 'credencial_escritura', 'usuarios_escritura', 'sesion_escritura', 'servicio_total'])
      assert.ok(report.includes(`"phase":"${phase}"`), phase);
    for (const value of [user.id, user.name, user.email, registration.password, secrets.values.get(DEVICE_KEY)!])
      assert.equal(report.includes(value), false);
    const saved = JSON.parse(secrets.values.get(credentialKey(user.id))!).password;
    assert.equal(report.includes(saved.hash), false);
    assert.equal(report.includes(saved.salt), false);
  } finally { authTiming.enable(false); }
});

test('el formato local funciona sin llamadas de red', async (context) => {
  const network = context.mock.method(globalThis, 'fetch', async () => { throw new Error('sin red'); });
  const storage = memory(), secrets = memory();
  const auth = createAuthService(storage, secrets,
    createPasswordHasher(async (size) => randomBytes(size), secrets), randomUUID);
  const user = await auth.register(registration);
  await auth.login(user.email, registration.password);
  assert.deepEqual(await auth.restore(), user);
  await auth.logout();
  assert.equal(network.mock.callCount(), 0);
});

test('el cálculo permite ejecutar temporizadores mientras trabaja', async () => {
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 0);
  try { await passwords.hash(registration.password); }
  finally { clearInterval(timer); }
  assert.ok(ticks > 1, 'La derivación debe ceder al bucle de eventos durante el cálculo');
});
