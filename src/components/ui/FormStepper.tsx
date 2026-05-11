import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SegmentedControl } from './FormPrimitives';
import { colours, layout, spacing } from '@/theme';

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
const BOTTOM_ACTIVATION_DISTANCE = 24;

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
    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent;
    const y = contentOffset.y;
    const entries = sections
      .map(section => ({ key: section.key, offset: sectionOffsets.current[section.key] ?? Infinity }))
      .filter(entry => entry.offset !== Infinity)
      .sort((a, b) => a.offset - b.offset);

    if (entries.length === 0) return;

    const isAtBottom = y + layoutMeasurement.height >= contentSize.height - BOTTOM_ACTIVATION_DISTANCE;
    let nextKey = entries[0].key;

    if (isAtBottom) {
      nextKey = entries[entries.length - 1].key;
    } else {
      const threshold = y + TAB_SCROLL_OFFSET + 32;
      for (const entry of entries) {
        if (entry.offset <= threshold) nextKey = entry.key;
      }
    }

    if (nextKey !== activeKey) setActiveKey(nextKey);
  }, [activeKey, sections]);

  const tabOptions = useMemo(() => (
    sections.map(section => ({ label: section.label, value: section.key }))
  ), [sections]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <SegmentedControl
          value={activeKey}
          onChange={scrollToSection}
          options={tabOptions}
          variant="underline"
          textVariant="labelMd"
        />
      </View>
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
    backgroundColor: colours.background,
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
