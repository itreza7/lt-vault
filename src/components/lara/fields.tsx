/**
 * Text inputs: PasswordField (masked + reveal, forwards a ref for focus
 * chaining), SearchField, and LaraField (labeled, secure/mono/multiline).
 */

import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { lc } from '../../laraTheme';
import { Icon } from '../../icons';
import { styles, d } from './styles';

/* Password field — left lock icon, masked input, right eye toggle. --------- */
export const PasswordField = forwardRef<
  TextInput,
  {
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    onSubmitEditing?: () => void;
    returnKeyType?: 'go' | 'next' | 'done';
    blurOnSubmit?: boolean;
  }
>(function PasswordFieldImpl(
  {
    value,
    onChangeText,
    placeholder = 'Master password',
    autoFocus = false,
    onSubmitEditing,
    returnKeyType = 'go',
    blurOnSubmit,
  },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.passField}>
      <Icon name="lock" size={18} color={lc.textMuted} />
      <TextInput
        ref={ref}
        style={styles.passInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={lc.textMuted}
        selectionColor={lc.primary}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable
        onPress={() => setHidden(h => !h)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        style={styles.eyeBtn}>
        <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color={lc.textMuted} />
      </Pressable>
    </View>
  );
});

/* Display search field — 48px, white, search icon + live input. ------------ */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search vault',
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color={lc.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={lc.textMuted}
        selectionColor={lc.primary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

/* Labeled white input — secure/reveal, mono, multiline, optional right slot. */
export function LaraField({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  revealable,
  mono: monoFace = false,
  multiline = false,
  keyboard = 'default',
  autoFocus = false,
  onSubmitEditing,
  right,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  revealable?: boolean;
  mono?: boolean;
  multiline?: boolean;
  keyboard?: KeyboardTypeOptions;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  right?: ReactNode;
}) {
  const [hidden, setHidden] = useState(secure);
  const canReveal = secure && (revealable ?? true);
  return (
    <View style={d.fieldGroup}>
      {label ? <Text style={d.fieldLabel}>{label}</Text> : null}
      <View style={d.inputWrap}>
        <TextInput
          style={[
            d.input,
            monoFace && d.inputMono,
            multiline && d.inputMulti,
            (canReveal || Boolean(right)) && d.inputPadRight,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={lc.textMuted}
          selectionColor={lc.primary}
          secureTextEntry={secure && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          autoFocus={autoFocus}
          multiline={multiline}
          keyboardType={keyboard}
          onSubmitEditing={multiline ? undefined : onSubmitEditing}
          returnKeyType={multiline ? 'default' : 'done'}
        />
        {canReveal ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show' : 'Hide'}
            style={d.inputAction}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color={lc.textMuted} />
          </Pressable>
        ) : right ? (
          <View style={d.inputAction}>{right}</View>
        ) : null}
      </View>
    </View>
  );
}
