/**
 * Cards & rows: LaraCard, GroupCard, SectionLabel, SettingsRow, LaraDetailRow.
 */

import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { lc, mono, shadow } from '../../laraTheme';
import { Icon, type IconName } from '../../icons';
import { styles, t, d } from './styles';
import { IconChip } from './chips';
import { LaraIconButton } from './buttons';

/* White card surface. ------------------------------------------------------ */
export function LaraCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

/* Grouped white card wrapping settings rows (rounded, clipped). ------------ */
export function GroupCard({ children }: { children: ReactNode }) {
  return <View style={[t.group, shadow.card]}>{children}</View>;
}

/* Uppercase section label. ------------------------------------------------- */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={t.sectionLabel}>{children}</Text>;
}

/* A row inside a grouped settings/issue card. ------------------------------ */
export function SettingsRow({
  icon,
  iconColor = lc.primary,
  iconTint = lc.tintBlue,
  label,
  sub,
  value,
  right,
  onPress,
  divider = false,
  chevron = false,
}: {
  icon: IconName;
  iconColor?: string;
  iconTint?: string;
  label: string;
  sub?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  divider?: boolean;
  chevron?: boolean;
}) {
  const body = (
    <>
      <IconChip icon={icon} color={iconColor} tint={iconTint} />
      <View style={t.rowMid}>
        <Text style={t.rowLabel}>{label}</Text>
        {sub ? <Text style={t.rowSub}>{sub}</Text> : null}
      </View>
      {value ? <Text style={t.rowValue}>{value}</Text> : null}
      {right}
      {chevron ? (
        <Icon name="chevronRight" size={18} color={lc.chevron} />
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          t.row,
          divider && t.rowDivider,
          pressed && { backgroundColor: lc.appBg },
        ]}>
        {body}
      </Pressable>
    );
  }
  return <View style={[t.row, divider && t.rowDivider]}>{body}</View>;
}

/* Detail row — label + value with optional reveal/copy. -------------------- */
export function LaraDetailRow({
  label,
  value,
  secret = false,
  monoFace = false,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  monoFace?: boolean;
  onCopy?: () => void;
}) {
  const [hidden, setHidden] = useState(secret);
  return (
    <View style={d.detailRow}>
      <View style={d.detailMain}>
        <Text style={d.detailLabel}>{label}</Text>
        <Text
          style={[d.detailValue, monoFace && { fontFamily: mono }]}
          selectable={!hidden}>
          {secret && hidden ? '••••••••••' : value}
        </Text>
      </View>
      <View style={d.detailActions}>
        {secret ? (
          <LaraIconButton
            name={hidden ? 'eye' : 'eyeOff'}
            onPress={() => setHidden(h => !h)}
            color={lc.textMuted}
            size={20}
            accessibilityLabel={hidden ? 'Show' : 'Hide'}
          />
        ) : null}
        {onCopy ? (
          <LaraIconButton
            name="copy"
            onPress={onCopy}
            color={lc.primary}
            size={20}
            accessibilityLabel={`Copy ${label}`}
          />
        ) : null}
      </View>
    </View>
  );
}
