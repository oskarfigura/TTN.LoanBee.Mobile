import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as {
  admobIosEnabled?: boolean;
} | undefined;

// Android advertising remains enabled. iOS advertising is opt-in so a new App
// Store submission can run without ATT, UMP consent, or ad requests.
export const ADS_ENABLED = Platform.OS !== 'ios' || extra?.admobIosEnabled === true;
