import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { authTiming, createAuthService, AuthError, type Registration, type User, type SecretStorage } from '../domain/auth-service';
import { createPasswordHasher } from '../domain/password';

// Sin fallback a AsyncStorage: en plataformas sin SecureStore se bloquea el acceso.
let secureStoreAvailable: Promise<boolean> | null = null;
const secrets: SecretStorage = {
  async getItem(key) {
    // La capacidad de la plataforma es estable; no se cachean valores ni claves.
    secureStoreAvailable ??= SecureStore.isAvailableAsync().catch((failure) => {
      secureStoreAvailable = null;
      throw failure;
    });
    if (!await secureStoreAvailable) throw new Error('SecureStore no disponible');
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

authTiming.enable(__DEV__ && process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS === '1');

export const authService = createAuthService(
  AsyncStorage, secrets,
  createPasswordHasher(Crypto.getRandomBytesAsync, secrets, authTiming.measure),
  Crypto.randomUUID,
);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);

  const restore = async () => {
    if (lock.current) return;
    lock.current = true;
    authTiming.start('restaurar');
    setLoading(true);
    setError('');
    try {
      const restored = await authService.restore();
      if (mounted.current) {
        authTiming.mark('estado_auth_solicitado');
        setUser(restored); setLoading(false);
      }
    } catch {
      authTiming.mark('operacion_fallida');
      if (mounted.current) setError('No se pudo abrir el almacenamiento seguro. Reintenta en Expo Go para Android o iOS.');
    } finally { lock.current = false; }
  };

  useEffect(() => {
    mounted.current = true;
    void restore();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (busy) authTiming.mark('indicador_carga_montado');
    else if (!loading) authTiming.mark('estado_auth_confirmado');
  }, [user, busy, loading]);

  const run = async (operation: 'registro' | 'login' | 'logout', action: () => Promise<unknown>) => {
    if (lock.current) return false;
    lock.current = true;
    authTiming.start(operation);
    setBusy(true);
    setError('');
    try {
      await action();
      if (mounted.current) {
        authTiming.mark('estado_auth_solicitado');
        setUser(authService.getUser());
      }
      return true;
    } catch (failure) {
      authTiming.mark('operacion_fallida');
      if (mounted.current) setError(failure instanceof AuthError ? failure.message :
        'No se pudo acceder al almacenamiento local. Reintenta; tus datos no se borraron.');
      return false;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return {
    user, loading, busy, error, restore,
    clearError: () => setError(''),
    register: (input: Registration) => run('registro', () => authService.register(input)),
    login: (email: string, password: string) => run('login', () => authService.login(email, password)),
    logout: () => run('logout', () => authService.logout()),
  };
}
