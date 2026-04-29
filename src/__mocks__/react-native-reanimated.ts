// Mock for react-native-reanimated in Jest tests
const Reanimated = {
  default: { View: 'Animated.View', Text: 'Animated.Text', ScrollView: 'Animated.ScrollView' },
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
