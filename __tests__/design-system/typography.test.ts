import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  fontFaces,
  fontFamilies,
  fonts,
  fontWeights,
  textStyles,
} from '@/shared/ui/theme/typography';

const repoRoot = path.resolve(__dirname, '../..');
const sourceRoots = ['app', 'src'];
const sourceExtensions = new Set(['.ts', '.tsx']);
const allowedTypographyFiles = new Set(['src/shared/ui/theme/typography.ts']);
const removedFontPackages = [
  '@expo-google-fonts/inter',
  '@expo-google-fonts/nunito',
  '@expo-google-fonts/sacramento',
];

const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const absolutePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(absolutePath);
  if (!sourceExtensions.has(path.extname(entry.name))) return [];
  return [absolutePath];
});

// Normalise to forward slashes so the allow-list (declared with `/`) matches on
// Windows, where path.relative yields backslash-separated paths.
const relativePath = (absolutePath: string) => path.relative(repoRoot, absolutePath).split(path.sep).join('/');

describe('typography system', () => {
  it('consolidates body and heading roles onto the same loaded Manrope faces', () => {
    expect(fonts.heading).toEqual(fonts.body);
    expect(new Set(Object.values(fonts.body))).toEqual(new Set(fontFamilies));
  });

  it('uses only registered font families and approved weights in text variants', () => {
    const approvedFamilies = new Set(fontFamilies);
    const approvedWeights = new Set(Object.values(fontWeights));

    Object.entries(textStyles).forEach(([variant, style]) => {
      expect({ variant, registered: approvedFamilies.has(style.fontFamily) }).toEqual({ variant, registered: true });
      expect({ variant, approved: approvedWeights.has(style.fontWeight) }).toEqual({ variant, approved: true });
    });

    Object.entries(fontFaces).forEach(([role, faces]) => {
      Object.entries(faces).forEach(([weight, style]) => {
        expect({ face: `${role}.${weight}`, registered: approvedFamilies.has(style.fontFamily) })
          .toEqual({ face: `${role}.${weight}`, registered: true });
        expect({ face: `${role}.${weight}`, approved: approvedWeights.has(style.fontWeight) })
          .toEqual({ face: `${role}.${weight}`, approved: true });
      });
    });
  });

  it('loads every font family referenced by the theme', () => {
    const rootLayout = fs.readFileSync(path.join(repoRoot, 'app/_layout.tsx'), 'utf8');

    fontFamilies.forEach(fontFamily => {
      expect({ fontFamily, loaded: rootLayout.includes(fontFamily) }).toEqual({ fontFamily, loaded: true });
    });
  });

  it('keeps component font styling centralized in the theme', () => {
    const violations = sourceRoots.flatMap(root => walk(path.join(repoRoot, root)))
      .map(absolutePath => {
        const relative = relativePath(absolutePath);
        if (allowedTypographyFiles.has(relative)) return null;

        const source = fs.readFileSync(absolutePath, 'utf8');
        const usesFontFamily = /fontFamily\s*:/.test(source);
        const usesFontWeight = /fontWeight\s*:/.test(source);

        if (!usesFontFamily && !usesFontWeight) return null;
        return relative;
      })
      .filter((value): value is string => value !== null);

    expect(violations).toEqual([]);
  });

  it('does not keep unused font packages installed', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const installedPackages = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    removedFontPackages.forEach(packageName => {
      expect(installedPackages).not.toHaveProperty(packageName);
    });
  });
});
