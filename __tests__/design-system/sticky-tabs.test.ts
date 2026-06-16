import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const sourceRoots = ['app', 'src'];
const sourceExtensions = new Set(['.ts', '.tsx']);

const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const absolutePath = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(absolutePath);
  if (!sourceExtensions.has(path.extname(entry.name))) return [];
  return [absolutePath];
});

// Normalise to forward slashes so reported paths read the same on Windows, where
// path.relative yields backslash-separated paths.
const relativePath = (absolutePath: string) => path.relative(repoRoot, absolutePath).split(path.sep).join('/');

// Strip block (`/* */`) and line (`//`) comments so the explanatory notes that *describe*
// the banned API (in LoanCalculationView / MortgageDetailView) don't count as usages.
const stripComments = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('tab strip touch targets', () => {
  // Regression guard. `stickyHeaderIndices` was used to pin tab strips at the top of a
  // ScrollView in both the calculator results view and the saved mortgage detail view.
  // On React Native's new architecture the sticky header's touch target does not follow
  // the visual translation, so once the user scrolled the tabs silently stopped
  // responding to taps. The fix renders the tab strip as a fixed sibling ABOVE the
  // ScrollView instead. Pinning interactive (tappable) headers via stickyHeaderIndices is
  // therefore banned — render them outside the scroll view. See the git history for
  // "fixing tab issues".
  it('never pins tappable headers with stickyHeaderIndices', () => {
    const violations = sourceRoots.flatMap(root => walk(path.join(repoRoot, root)))
      .map(absolutePath => {
        const source = stripComments(fs.readFileSync(absolutePath, 'utf8'));
        return source.includes('stickyHeaderIndices') ? relativePath(absolutePath) : null;
      })
      .filter((value): value is string => value !== null);

    expect(violations).toEqual([]);
  });
});
