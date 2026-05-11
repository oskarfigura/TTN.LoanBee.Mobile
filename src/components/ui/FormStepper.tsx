import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText } from './AppText';
import { colours, elevation, layout, radii, spacing } from '@/theme';

export interface FormStepperSection {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface Props {
  sections: FormStepperSection[];
  footer?: React.ReactNode;
  banner?: React.ReactNode;
  contentPadding?: number;
}

const TAB_SCROLL_OFFSET = 12;

export const FormStepper = ({ sections, footer, banner, contentPadding = layout.screenPadding }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? '');

  const handleSectionLayout = useCallback((key: string) => (event: LayoutChangeEvent) => {
    sectionOffsets.current[key] = event.nativeEvent.layout.y;
  }, []);

  const scrollToSection = useCallback((key: string) => {
    const offset = sectionOffsets.current[key];
    if (offset === undefined) return;

    setActiveKey(key);
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - TAB_SCROLL_OFFSET), animated: true });
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const entries = sections
      .map(section => ({ key: section.key, offset: sectionOffsets.current[section.key] ?? Infinity }))
      .filter(entry => entry.offset !== Infinity)
      .sort((a, b) => a.offset - b.offset);

    if (entries.length === 0) return;

    const threshold = y + TAB_SCROLL_OFFSET + 32;
    let nextKey = entries[0].key;
    for (const entry of entries) {
      if (entry.offset <= threshold) nextKey = entry.key;
    }

    if (nextKey !== activeKey) setActiveKey(nextKey);
  }, [activeKey, sections]);

  const tabs = useMemo(() => (
    <View style={styles.tabBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {sections.map(section => {
          const active = section.key === activeKey;
          return (
            <TouchableOpacity
              key={section.key}
              onPress={() => scrollToSection(section.key)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.84}
            >
              <AppText variant="labelMd" tone={active ? 'inverse' : 'muted'}>
                {section.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [activeKey, scrollToSection, sections]);

  return (
    <View style={styles.container}>
      {tabs}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
      >
        {banner ? <View style={styles.banner}>{banner}</View> : null}
        {sections.map(section => (
          <View
            key={section.key}
            onLayout={handleSectionLayout(section.key)}
            style={styles.sectionWrapper}
          >
            {section.content}
          </View>
        ))}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },
  tabBar: {
    backgroundColor: colours.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    ...elevation.level1,
  },
  tabRow: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.chip,
    backgroundColor: colours.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colours.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  banner: {
    marginBottom: spacing.xs,
  },
  sectionWrapper: {
    gap: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
});
