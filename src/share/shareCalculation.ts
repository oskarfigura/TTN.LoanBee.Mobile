import { Alert, Platform, Share } from 'react-native';
import { buildCalculationSharePayload, CalculationShareInput } from '@/share/calculationShareMessage';

export const shareCalculation = async (input: CalculationShareInput): Promise<void> => {
  const { title, message, url } = buildCalculationSharePayload(input);
  try {
    // iOS surfaces `url` as its own share item, so also embedding it in `message`
    // duplicates the link. Pass it separately there (keeps the rich link preview);
    // Android ignores the `url` field, so append it to the message text instead.
    await Share.share(
      Platform.OS === 'ios'
        ? { title, message, url }
        : { title, message: `${message}\n${url}` },
    );
  } catch {
    Alert.alert(input.t('share.errorTitle'), input.t('share.errorMessage'));
  }
};
