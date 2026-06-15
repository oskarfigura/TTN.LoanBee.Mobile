import React from 'react';

type WithChildren = { children?: React.ReactNode };

export const ButtonVariant = {
  Primary: 'primary',
  Secondary: 'secondary',
  Destructive: 'destructive',
  Transparent: 'transparent',
  Ghost: 'ghost',
  InvertedGhost: 'invertedGhost',
  Warning: 'warning',
} as const;

export const ThemeProvider = ({ children }: WithChildren) => React.createElement(React.Fragment, null, children);
export const useTheme = () => ({});
export const createTheme = (theme: Record<string, unknown>) => theme;
export const light = {};
export const dark = {};

export const AppText = ({ children, ...props }: WithChildren) => React.createElement('AppText', props, children);
export const Heading = ({ children, ...props }: WithChildren) => React.createElement('Heading', props, children);
export const P = ({ children, ...props }: WithChildren) => React.createElement('P', props, children);
export const Span = ({ children, ...props }: WithChildren) => React.createElement('Span', props, children);
export const Strong = ({ children, ...props }: WithChildren) => React.createElement('Strong', props, children);

export const Button = (props: Record<string, unknown>) => React.createElement('Button', props);
export const HeaderIconButton = (props: Record<string, unknown>) => React.createElement('HeaderIconButton', props);
export const QuickActionTile = (props: Record<string, unknown>) => React.createElement('QuickActionTile', props);
export const ProgressBar = (props: Record<string, unknown>) => React.createElement('ProgressBar', props);
export const Spinner = (props: Record<string, unknown>) => React.createElement('Spinner', props);
export const Badge = ({ children, ...props }: WithChildren) => React.createElement('Badge', props, children);
export const Card = ({ children, ...props }: WithChildren) => React.createElement('Card', props, children);
export const DismissibleBanner = ({ children, ...props }: WithChildren) => React.createElement('DismissibleBanner', props, children);
export const EmptyState = ({ children, ...props }: WithChildren) => React.createElement('EmptyState', props, children);
export const Field = ({ children, ...props }: WithChildren) => React.createElement('Field', props, children);
export const Checkbox = (props: Record<string, unknown>) => React.createElement('Checkbox', props);
export const Input = (props: Record<string, unknown>) => React.createElement('Input', props);

export const AppTextInput = (props: Record<string, unknown>) => React.createElement('AppTextInput', props);
export const FieldError = ({ message }: { message?: string }) => (
  message ? React.createElement('FieldError', null, message) : null
);
export const FieldHint = ({ children, ...props }: WithChildren) => React.createElement('FieldHint', props, children);
export const FieldLabel = ({ children, ...props }: WithChildren) => React.createElement('FieldLabel', props, children);
export const FormSection = ({ children, ...props }: WithChildren) => React.createElement('FormSection', props, children);
export const InputAffix = ({ children, ...props }: WithChildren) => React.createElement('InputAffix', props, children);
export const InputSurface = ({ children, ...props }: WithChildren) => React.createElement('InputSurface', props, children);
export const PillSelector = (props: Record<string, unknown>) => React.createElement('PillSelector', props);
export const SegmentedControl = (props: Record<string, unknown>) => React.createElement('SegmentedControl', props);

export const TextSize = {};
export const HeadingType = {};
