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
import { useColorScheme } from '@/hooks/use-color-scheme';

import { GeoCamLogo } from './GeoCamLogo';
import { ThemedText } from './themed-text';
import { ThemeToggleButton } from './ThemeToggleButton';

/** Las secciones de GeoCam en la interfaz web. */
const WEB_SECTIONS = [
  { name: 'inicio', href: '/', label: 'Inicio', icon: Icons.home },
  { name: 'camara', href: '/geocam', label: 'Cámara', icon: Icons.camera },
  { name: 'biblioteca', href: '/biblioteca', label: 'Biblioteca', icon: Icons.library },
  { name: 'nube', href: '/nube' as Href, label: 'Nube', icon: Icons.cloud },
  { name: 'mapa', href: '/mapa', label: 'Mapa', icon: Icons.map },
] as const satisfies readonly { name: string; href: Href; label: string; icon: AppIcon }[];

type SectionTabProps = TabTriggerSlotProps & {
  icon: AppIcon;
  label: string;
  showLabel: boolean;
};

function SectionTab({ icon, label, showLabel, isFocused, ...props }: SectionTabProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      {...(props as any)}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tab,
        isFocused
          ? (isDark ? styles.tabActiveDark : styles.tabActiveLight)
          : styles.tabIdle,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={icon}
        size={18}
        tintColor={isFocused ? Brand.primary : (isDark ? Brand.onDarkMuted : '#71717A')}
        style={styles.tabIcon}
      />
      {showLabel ? (
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          tone={isFocused ? (isDark ? 'onDark' : undefined) : (isDark ? 'onDarkMuted' : undefined)}
          themeColor={isFocused ? 'text' : 'textSecondary'}
        >
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

type WebHeaderProps = TabListProps & { showWordmark: boolean };

function WebHeader({ children, style, showWordmark }: WebHeaderProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        style,
        styles.header,
        {
          backgroundColor: isDark ? Night.backdrop : '#FFFFFF',
          borderBottomColor: isDark ? Night.border : '#E4E4E7',
        },
      ]}
    >
      <View style={styles.brand}>
        <GeoCamLogo size={32} />
        {showWordmark ? (
          <ThemedText type="smallBold" numberOfLines={1} tone={isDark ? 'onDark' : undefined}>
            GeoCam
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.nav}>{children}</View>

      <View style={styles.rightAction}>
        <ThemeToggleButton />
      </View>
    </View>
  );
}

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const showWordmark = width >= 520;
  const showLabel = width >= 400;

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
    gap: Spacing.two,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rightAction: {
    marginLeft: Spacing.one,
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
  tabActiveDark: {
    backgroundColor: Night.fillStrong,
  },
  tabActiveLight: {
    backgroundColor: '#F4F4F5',
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
