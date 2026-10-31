import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius } from '../constants/theme';
import type { TaskFilter } from '../types/task';

type FilterOption = { id: TaskFilter; label: string; count: number };

type FilterBarProps = {
  options: FilterOption[];
  selected: TaskFilter;
  onSelect: (filter: TaskFilter) => void;
  completedCount: number;
  onClearCompleted: () => void;
};

export function FilterBar({
  options,
  selected,
  onSelect,
  completedCount,
  onClearCompleted,
}: FilterBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.pills}>
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.id)}
              style={[styles.pill, isSelected && styles.pillSelected]}
            >
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.count, isSelected && styles.labelSelected]}>
                {option.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {completedCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={onClearCompleted}
          style={styles.clearButton}
        >
          <Text style={styles.clearText}>Limpiar hechas</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: radius.sm,
  },
  pillSelected: {
    backgroundColor: colors.primarySelected,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.body - 1,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.primaryText,
  },
  count: {
    color: colors.textSubtle,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  clearButton: {
    marginLeft: 'auto',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  clearText: {
    color: colors.textSubtle,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
});
