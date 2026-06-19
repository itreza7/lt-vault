/**
 * GradientButton (primary CTA) and LaraIconButton (light icon button).
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { lc, lr, shadow } from '../../laraTheme';
import { Icon, type IconName } from '../../icons';
import { styles, d } from './styles';
import { BrandGradient } from './gradient';

/* Primary gradient button. ------------------------------------------------- */
export function GradientButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  height = 54,
  icon,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  height?: number;
  icon?: IconName;
}) {
  const blocked = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.gradBtn,
        { height, borderRadius: lr.field },
        shadow.primary,
        pressed && !blocked && styles.pressed,
        blocked && styles.dim,
      ]}>
      <BrandGradient radius={lr.field} />
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Icon name={icon} size={18} color="#fff" /> : null}
          <Text style={styles.gradBtnText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* Light icon button (top bars, inline actions). --------------------------- */
export function LaraIconButton({
  name,
  onPress,
  color = lc.primary,
  size = 22,
  accessibilityLabel,
  disabled = false,
  active = false,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        d.iconBtn,
        active && d.iconBtnActive,
        pressed && !disabled && d.iconBtnActive,
        disabled && { opacity: 0.4 },
      ]}>
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
