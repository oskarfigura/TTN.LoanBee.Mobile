import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  ButtonVariant,
  Checkbox,
  Field,
  Heading,
  Input,
  P,
  Spinner,
  ThemeProvider,
} from '@oskarfigura/ui-native';
import { loanBeeNativeTheme } from '@/dev/uiNativeDemoTheme';

/**
 * Dev/demo route showcasing the shared @oskarfigura/ui-native components themed with the
 * LoanBee palette. Reachable at /ui-native-demo; not linked in navigation.
 */
export default function UiNativeDemoScreen() {
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const emailError = email.length > 0 && !email.includes('@') ? 'Enter a valid email' : undefined;

  return (
    <ThemeProvider theme={loanBeeNativeTheme}>
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'ui-native demo' }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Heading>@oskarfigura/ui-native</Heading>
          <P>Shared cross-platform components, themed with the LoanBee palette via createTheme.</P>

          <View style={styles.row}>
            <Button variant={ButtonVariant.Primary} label="Primary" onPress={() => {}} />
            <Button variant={ButtonVariant.Secondary} label="Secondary" onPress={() => {}} />
            <Button variant={ButtonVariant.Destructive} label="Delete" onPress={() => {}} />
          </View>

          <View style={styles.row}>
            <Button variant={ButtonVariant.Primary} label="Loading" loading />
            <Button variant={ButtonVariant.Primary} label="Disabled" disabled />
          </View>

          <View style={styles.row}>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </View>

          <Spinner variant={ButtonVariant.Primary} />

          <Field label="Email" error={emailError}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              error={!!emailError}
            />
          </Field>

          <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the terms" />
        </ScrollView>
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
});
