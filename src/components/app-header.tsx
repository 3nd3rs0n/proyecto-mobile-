import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize } from '../constants/theme';

/**
 * Parte superior de la pantalla (equivalente a ion-header):
 * marca de la app, indicador de guardado, fecha de hoy y mensaje principal.
 */
export function AppHeader() {
  const todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <View accessibilityRole="header">
      <View style={styles.topbar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandCheck}>✓</Text>
          </View>
          <Text style={styles.brandName}>paso a paso</Text>
        </View>
        <View style={styles.saveIndicator}>
          <View style={styles.saveDot} />
          <Text style={styles.saveText}>Guardado automático</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.dateLabel}>{todayLabel}</Text>
        <Text style={styles.heroTitle}>
          Lo que toca,{'\n'}
          <Text style={styles.heroAccent}>sin prisa.</Text>
        </Text>
        <Text style={styles.heroCopy}>Un paso a la vez. Haz espacio para lo que importa.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  brandCheck: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  brandName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.saved,
  },
  saveText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
  hero: {
    marginTop: 40,
    marginBottom: 24,
  },
  dateLabel: {
    marginBottom: 12,
    color: colors.primary,
    fontSize: fontSize.small,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'capitalize',
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '800',
    letterSpacing: -2.2,
    lineHeight: 53,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroCopy: {
    maxWidth: 310,
    marginTop: 12,
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 21,
  },
});
