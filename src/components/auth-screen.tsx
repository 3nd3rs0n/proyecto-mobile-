import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontSize, radius } from '../constants/theme';
import { authTiming } from '../domain/auth-service';
import type { useAuth } from '../hooks/use-auth';

export function AuthScreen({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!auth.busy) authTiming.mark('formulario_listo');
  }, [auth.busy, registering, notice]);

  const switchMode = () => {
    if (auth.busy) return;
    setRegistering((value) => !value);
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setShowConfirmation(false);
    setNotice('');
    auth.clearError();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (auth.busy) return true;
      if (!registering) return false;
      switchMode();
      return true;
    });
    return () => subscription.remove();
  }, [registering, auth.busy]);

  const submit = async () => {
    setNotice('');
    if (registering) {
      if (await auth.register({ name, email, password, confirmation })) {
        setRegistering(false);
        setPassword('');
        setConfirmation('');
        setShowPassword(false);
        setShowConfirmation(false);
        setNotice('Cuenta creada. Inicia sesión con tu correo y contraseña.');
      }
    } else if (await auth.login(email, password)) {
      setPassword('');
      setShowPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.brand}>Ipss Eva 2</Text>
          <Text style={styles.brand}>✓ paso a paso</Text>
          <Text accessibilityRole="header" style={styles.title}>{registering ? 'Crea tu cuenta.' : 'Vuelve a tu ritmo.'}</Text>
          <Text style={styles.copy}>Tus cuentas y tareas se guardan en este dispositivo.</Text>
          <View style={styles.card}>
            {registering && <>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput placeholder="Nombre de usuario" accessibilityLabel="Nombre de usuario" style={styles.input} value={name} onChangeText={setName} maxLength={80} autoComplete="name" editable={!auth.busy} />
            </>}
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput placeholder="Correo electrónico" accessibilityLabel="Correo electrónico" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!auth.busy} />
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordField}>
              <TextInput placeholder="Ingresa tu contraseña" accessibilityLabel="Contraseña" style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={registering ? 'new-password' : 'current-password'} maxLength={128} editable={!auth.busy} />
              <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityState={{ selected: showPassword, disabled: auth.busy }} disabled={auth.busy} onPress={() => setShowPassword((visible) => !visible)} style={({ pressed }) => [styles.visibilityButton, pressed && styles.disabled]}>
                <EyeIcon crossed={showPassword} />
              </Pressable>
            </View>
            {registering && <>
              <Text style={styles.copy}>Usa al menos 8 caracteres.</Text>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordField}>
                <TextInput placeholder="Confirmar contraseña" accessibilityLabel="Confirmar contraseña" style={[styles.input, styles.passwordInput]} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showConfirmation} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" maxLength={128} editable={!auth.busy} />
                <Pressable accessibilityRole="button" accessibilityLabel={showConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} accessibilityState={{ selected: showConfirmation, disabled: auth.busy }} disabled={auth.busy} onPress={() => setShowConfirmation((visible) => !visible)} style={({ pressed }) => [styles.visibilityButton, pressed && styles.disabled]}>
                  <EyeIcon crossed={showConfirmation} />
                </Pressable>
              </View>
            </>}
            {!!auth.error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{auth.error}</Text>}
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.copy}>{notice}</Text>}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: auth.busy }} disabled={auth.busy} style={[styles.button, auth.busy && styles.disabled]} onPress={() => void submit()}>
              {auth.busy ? <>
                <ActivityIndicator color={colors.white} />
                <Text accessibilityLiveRegion="polite" style={styles.buttonText}>{registering ? 'Creando cuenta…' : 'Iniciando sesión…'}</Text>
              </> : <Text style={styles.buttonText}>{registering ? 'Registrarse' : 'Iniciar sesión'}</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" disabled={auth.busy} style={styles.link} onPress={switchMode}>
              <Text style={styles.linkText}>{registering ? 'Volver al inicio de sesión' : 'Crear una cuenta'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return <View style={styles.eye} importantForAccessibility="no-hide-descendants">
    <View style={styles.pupil} />
    {crossed && <View style={styles.eyeSlash} />}
  </View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, gap: 16 },
  brand: { color: colors.primary, fontWeight: '800', fontSize: fontSize.emphasis },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  copy: { color: colors.textMuted, fontSize: fontSize.body, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textBody, fontWeight: '600', fontSize: fontSize.body },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, minHeight: 48, color: colors.text, fontSize: fontSize.input },
  passwordField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  passwordInput: { flex: 1, minWidth: 0, borderWidth: 0 },
  visibilityButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  eye: { width: 22, height: 14, borderWidth: 1.5, borderColor: colors.textMuted, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  eyeSlash: { position: 'absolute', width: 26, height: 2, backgroundColor: colors.textMuted, transform: [{ rotate: '-45deg' }] },
  error: { color: colors.danger, fontSize: fontSize.body, lineHeight: 21 },
  button: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.sm, marginTop: 8 },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: fontSize.input },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.body },
});
