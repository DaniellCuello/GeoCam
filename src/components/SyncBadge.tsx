// src/components/SyncBadge.tsx
// Indicador interactivo del estado de sincronización (T6).
// Permite al usuario ver si la app está al día, sin conexión o sincronizando,
// y tocar para forzar la sincronización manual cuando hay conexión.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Brand, Night, Radii, Spacing } from '@/constants/theme';
import { useSync } from '@/hooks/useSync';

export function SyncBadge() {
  const sync = useSync();

  let dotColor = '#10B981';
  let label = 'Al día';

  if (!sync.isOnline) {
    dotColor = '#F59E0B';
    label = sync.pendingCount > 0 ? `Sin conexión (${sync.pendingCount})` : 'Sin conexión';
  } else if (sync.isSyncing) {
    dotColor = '#38BDF8';
    label = 'Sincronizando…';
  } else if (sync.error) {
    dotColor = Brand.danger;
    label = 'Error · Reintentar';
  } else if (sync.pendingCount > 0) {
    dotColor = '#F59E0B';
    label = `${sync.pendingCount} pendiente${sync.pendingCount > 1 ? 's' : ''}`;
  }

  return (
    <Pressable
      onPress={() => sync.syncNow()}
      disabled={!sync.isOnline || sync.isSyncing}
      accessibilityRole="button"
      accessibilityLabel={`Estado de sincronización: ${label}`}
      style={({ pressed }) => [
        styles.badge,
        { opacity: pressed && sync.isOnline && !sync.isSyncing ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <ThemedText type="smallBold" style={[styles.label, { color: dotColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Night.fillStrong,
    borderWidth: 1,
    borderColor: Night.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
  },
});
