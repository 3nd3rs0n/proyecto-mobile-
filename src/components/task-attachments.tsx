import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, touchTarget } from '../constants/theme';
import { describeLocation } from '../domain/task-location';
import type { TaskAttachmentsState } from '../hooks/use-task-attachments';

type TaskAttachmentsProps = TaskAttachmentsState & { disabled?: boolean };

export function TaskAttachments({
  imageUri,
  location,
  savingPhoto,
  locating,
  notice,
  canRemovePhoto,
  canRemoveLocation,
  takePhoto,
  pickPhoto,
  removePhoto,
  addLocation,
  removeLocation,
  openSettings,
  dismissNotice,
  disabled = false,
}: TaskAttachmentsProps) {
  const busy = disabled || savingPhoto;

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        <AttachButton icon="📷" label="Cámara" onPress={takePhoto} disabled={busy} />
        <AttachButton icon="🖼️" label="Galería" onPress={pickPhoto} disabled={busy} />
        {!location && !locating && (
          <AttachButton icon="📍" label="Ubicación" onPress={addLocation} disabled={disabled} />
        )}
      </View>

      {savingPhoto && (
        <View style={styles.locationRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.locationText}>Guardando la foto…</Text>
        </View>
      )}

      {imageUri && (
        <View style={styles.photoRow}>
          <Image source={{ uri: imageUri }} style={styles.photo} accessibilityLabel="Foto adjunta" />
          {canRemovePhoto && <RemoveButton label="Quitar foto" onPress={() => void removePhoto()} />}
        </View>
      )}

      {locating && (
        <View style={styles.locationRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.locationText}>Buscando tu ubicación…</Text>
          <RemoveButton label="Cancelar" onPress={removeLocation} />
        </View>
      )}

      {location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationText} numberOfLines={2}>
            📍 {describeLocation(location)}
          </Text>
          {canRemoveLocation && <RemoveButton label="Quitar" onPress={removeLocation} />}
        </View>
      )}

      {notice && (
        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{notice.message}</Text>
          <View style={styles.noticeActions}>
            {notice.canOpenSettings && (
              <Pressable accessibilityRole="button" onPress={openSettings} style={styles.noticeButton}>
                <Text style={styles.noticeButtonText}>Abrir Ajustes</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={dismissNotice} style={styles.noticeButton}>
              <Text style={styles.noticeDismissText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

type AttachButtonProps = { icon: string; label: string; onPress: () => void; disabled: boolean };

function AttachButton({ icon, label, onPress, disabled }: AttachButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Adjuntar desde ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.attachButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.attachIcon}>{icon}</Text>
      <Text style={styles.attachLabel}>{label}</Text>
    </Pressable>
  );
}

function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.removeButton}>
      <Text style={styles.removeText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primarySelected,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  attachIcon: {
    fontSize: fontSize.body,
  },
  attachLabel: {
    color: colors.primaryText,
    fontSize: fontSize.body - 1,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.track,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSize.small + 1,
  },
  removeButton: {
    minHeight: 32,
    justifyContent: 'center',
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  notice: {
    gap: 6,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  noticeText: {
    color: colors.textBody,
    fontSize: fontSize.small + 1,
    lineHeight: 18,
  },
  noticeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  noticeButton: {
    minHeight: touchTarget - 12,
    justifyContent: 'center',
  },
  noticeButtonText: {
    color: colors.primaryText,
    fontSize: fontSize.small + 1,
    fontWeight: '700',
  },
  noticeDismissText: {
    color: colors.textMuted,
    fontSize: fontSize.small + 1,
    fontWeight: '600',
  },
});
