// Mock for react-native-reanimated in Jest tests
const animatedHosts = { View: 'Animated.View', Text: 'Animated.Text', ScrollView: 'Animated.ScrollView' };
const Reanimated = {
  // Expose the host components both at the top level and under `default`, so the
  // mock resolves whether a call site does `import Animated from ...` (which gets
  // the whole module object under ts-jest's CommonJS interop) or `.default.View`.
  ...animatedHosts,
  default: animatedHosts,
  useSharedValue: (val: unknown) => ({ value: val }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (val: unknown) => val,
  withSpring: (val: unknown) => val,
  withRepeat: (val: unknown) => val,
  withSequence: (...vals: unknown[]) => vals[0],
  interpolate: () => 0,
  Extrapolate: { CLAMP: 'clamp' },
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  createAnimatedComponent: (component: unknown) => component,
};
export default Reanimated;
module.exports = Reanimated;
