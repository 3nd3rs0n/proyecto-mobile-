import { StyleSheet, Text, View } from 'react-native';

import { cardShadow, colors, fontSize, radius } from '../constants/theme';

type ProgressCardProps = {
  completed: number;
  total: number;
  percent: number;
};

/** Tarjeta con el avance: cuántas tareas están hechas y una barra de progreso. */
export function ProgressCard({ completed, total, percent }: ProgressCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>TU PROGRESO</Text>
          <Text style={styles.summary}>
            {`${completed} de ${total} ${total === 1 ? 'tarea completada' : 'tareas completadas'}`}
          </Text>
        </View>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Tareas completadas"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(98, 86, 217, 0.08)',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ...cardShadow,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
  },
  iconText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
  },
  kicker: {
    marginBottom: 4,
    color: colors.textMuted,
    fontSize: fontSize.kicker,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  summary: {
    color: colors.textBody,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  percent: {
    color: colors.primary,
    fontSize: fontSize.emphasis,
    fontWeight: '700',
  },
  track: {
    height: 7,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.track,
  },
  fill: {
    height: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.progress,
  },
});
