import { AppText } from '@oskarfigura/ui-native';
import { EmptyState as NativeEmptyState, type EmptyStateProps } from '@oskarfigura/ui-native';

type Props = Omit<EmptyStateProps, 'icon'>;

export const EmptyState = (props: Props) => (
  <NativeEmptyState
    {...props}
    icon={<AppText variant="title1" tone="accent">🐝</AppText>}
  />
);
