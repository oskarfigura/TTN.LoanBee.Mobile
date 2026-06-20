import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';

const fromRoot = (path: string) => join(process.cwd(), path);
const read = (path: string) => readFileSync(fromRoot(path), 'utf8');

describe('bottom navigation ownership', () => {
  it('keeps exactly four visible tab destinations', () => {
    const tabs = read('app/(tabs)/_layout.tsx');
    const screenNames = [...tabs.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)]
      .map(match => match[1]);

    expect(screenNames).toEqual(['index', 'saved', 'calculate', 'settings']);
    expect(tabs).not.toContain('name="result"');
    expect(tabs).toContain("screen: 'index'");
  });

  it('owns browse routes inside their active tab stacks', () => {
    const calculateStack = read('app/(tabs)/calculate/_layout.tsx');
    const savedStack = read('app/(tabs)/saved/_layout.tsx');
    const settingsStack = read('app/(tabs)/settings/_layout.tsx');

    expect(calculateStack).toMatch(/<Stack\.Screen\s+name="result"/);
    expect(calculateStack).toMatch(/gestureEnabled:\s*!/);
    expect(calculateStack).toContain('returnTo?: string');
    expect(savedStack).toMatch(/<Stack\.Screen\s+name="recent"/);
    expect(savedStack).toMatch(/<Stack\.Screen\s+name="\[id\]"/);
    expect(settingsStack).toMatch(/<Stack\.Screen\s+name="about"/);

    [
      'app/(tabs)/calculate/result.tsx',
      'app/(tabs)/saved/recent.tsx',
      'app/(tabs)/saved/[id].tsx',
      'app/(tabs)/settings/about.tsx',
    ].forEach(path => expect(existsSync(fromRoot(path))).toBe(true));
  });

  it('keeps focused create and edit flows above the tab shell', () => {
    const rootStack = read('app/_layout.tsx');

    [
      'calculator/share',
      'saved/new',
      'saved/track',
      'saved/[id]/edit',
      'saved/[id]/overpayments/index',
      'saved/[id]/lump-sum/new',
      'saved/[id]/deals/new',
      'saved/[id]/deals/[dealId]',
      'saved/[id]/deals/[dealId]/overpayments',
      'saved/[id]/events/new',
      'saved/[id]/events/[eventId]',
      'saved/[id]/complete-current',
    ].forEach(route => expect(rootStack).toContain(`name="${route}"`));

    ['name="about"', 'name="saved/recent"', 'name="saved/[id]"']
      .forEach(route => expect(rootStack).not.toContain(route));
  });

  it('routes the public share handoff into Calculate results and back to Home', () => {
    const shareHandoff = read('app/calculator/share.tsx');

    expect(shareHandoff).toContain("pathname: '/calculate/result'");
    expect(shareHandoff).toContain("returnTo: '/'");
  });

  it('lets the tab bar own the bottom inset on every browse detail screen', () => {
    [
      'app/(tabs)/calculate/result.tsx',
      'app/(tabs)/saved/recent.tsx',
      'app/(tabs)/saved/[id].tsx',
      'app/(tabs)/settings/about.tsx',
    ].forEach(path => {
      expect(read(path)).not.toContain("edges={['bottom']}");
    });
  });
});
