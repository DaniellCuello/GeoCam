import type { Href } from 'expo-router';
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Icons, type AppIcon } from '@/constants/icons';
import { Brand, Layout, Night, Radii, Spacing } from '@/constants/theme';

import { GeoCamLogo } from './GeoCamLogo';
import { ThemedText } from './themed-text';

/** Las únicas secciones reales de GeoCam. No hay enlaces de documentación. */
const WEB_SECTIONS = [
  { name: 'inicio', href: '/', label: 'Inicio', icon: Icons.home },
  { name: 'camara', href: '/geocam', label: 'Cámara', icon: Icons.camera },
  { name: 'mapa', href: '/mapa', label: 'Mapa', icon: Icons.map },
] as const satisfies readonly { name: string; href: Href; label: string; icon: AppIcon }[];

type SectionTabProps = TabTriggerSlotProps & {
  icon: AppIcon;
  label: string;
  showLabel: boolean;
};

/**
 * La barra es siempre oscura porque la página de Inicio lo es: una barra clara
 * sobre un fondo negro rompería la continuidad en el salto entre pestañas.
 */
function SectionTab({ icon, label, showLabel, isFocused, ...props }: SectionTabProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tab,
        isFocused ? styles.tabActive : styles.tabIdle,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={icon}
        size={18}
        tintColor={isFocused ? Brand.primaryLight : Brand.onDarkMuted}
        style={styles.tabIcon}
      />
      {showLabel ? (
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          tone={isFocused ? 'onDark' : 'onDarkMuted'}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

type WebHeaderProps = TabListProps & { showWordmark: boolean };

/**
 * Barra superior de la web.
 *
 * Va en el flujo del layout (antes de `TabSlot`) y no flotando encima, así que
 * ninguna pantalla queda oculta bajo ella. En pantallas estrechas se oculta
 * primero el nombre y después las etiquetas, para no ocupar casi nada de alto.
 */
function WebHeader({ children, style, showWordmark }: WebHeaderProps) {
  return (
    <View style={[style, styles.header, { borderBottomColor: Night.border }]}>
      <View style={styles.brand}>
        <GeoCamLogo size={28} />
        {showWordmark ? (
          <ThemedText type="smallBold" numberOfLines={1} tone="onDark">
            GeoCam
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.nav}>{children}</View>
    </View>
  );
}

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const showWordmark = width >= 480;
  const showLabel = width >= 360;

  return (
    <Tabs>
      <TabList asChild>
        <WebHeader showWordmark={showWordmark}>
          {WEB_SECTIONS.map((section) => (
            <TabTrigger key={section.name} name={section.name} href={section.href} asChild>
              <SectionTab
                icon={section.icon}
                label={section.label}
                showLabel={showLabel}
              />
            </TabTrigger>
          ))}
        </WebHeader>
      </TabList>
      <TabSlot />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: Spacing.two,
    backgroundColor: Night.backdrop,
    borderBottomWidth: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: 'auto',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouch - 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
  },
  tabActive: {
    backgroundColor: Night.fillStrong,
  },
  tabIdle: {
    backgroundColor: 'transparent',
  },
  tabIcon: {
    width: 20,
    height: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
