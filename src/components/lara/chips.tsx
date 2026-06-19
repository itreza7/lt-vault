/**
 * Chips & small visuals: LaraChip (filter pill), IconChip (tinted glyph),
 * TypeChip (category glyph), LetterAvatar, OrDivider.
 */

import { Pressable, Text, View } from 'react-native';

import { lc } from '../../laraTheme';
import { Icon, type IconName } from '../../icons';
import { styles, t } from './styles';

/* Category pill chip. ------------------------------------------------------ */
export function LaraChip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* Small tinted icon chip (settings rows, issue rows). ---------------------- */
export function IconChip({
  icon,
  color,
  tint,
  size = 34,
  radius = 10,
}: {
  icon: IconName;
  color: string;
  tint: string;
  size?: number;
  radius?: number;
}) {
  return (
    <View
      style={[
        t.chipBox,
        { width: size, height: size, borderRadius: radius, backgroundColor: tint },
      ]}>
      <Icon name={icon} size={Math.round(size * 0.53)} color={color} />
    </View>
  );
}

/* Category chip — tinted square with the type glyph. ----------------------- */
const CATEGORY: Record<string, { icon: IconName; color: string; tint: string }> = {
  login: { icon: 'login', color: lc.primary, tint: lc.tintBlue },
  password: { icon: 'key', color: lc.secondary, tint: lc.tintViolet },
  card: { icon: 'card', color: lc.success, tint: lc.tintGreen },
  note: { icon: 'note', color: lc.warning, tint: lc.tintAmber },
  identity: { icon: 'identity', color: lc.dangerAlt, tint: lc.tintRose },
};

export function TypeChip({ type, size = 64 }: { type: string; size?: number }) {
  const m = CATEGORY[type] ?? CATEGORY.login;
  return (
    <IconChip
      icon={m.icon}
      color={m.color}
      tint={m.tint}
      size={size}
      radius={size >= 56 ? 18 : 12}
    />
  );
}

/* Colored letter avatar for a vault row. ----------------------------------- */
export function LetterAvatar({
  letter,
  color,
  size = 42,
}: {
  letter: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, backgroundColor: color },
      ]}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

/* Hairline "or" divider. --------------------------------------------------- */
export function OrDivider() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>or</Text>
      <View style={styles.orLine} />
    </View>
  );
}
