/**
 * Bottom tab bar — light surface, blue active tab.
 */

import { Pressable, Text, View } from 'react-native';

import { lc } from '../../laraTheme';
import { Icon, type IconName } from '../../icons';
import { t } from './styles';

export type LaraTabKey = 'vault' | 'generate' | 'settings';

const LARA_TABS: { key: LaraTabKey; label: string; icon: IconName }[] = [
  { key: 'vault', label: 'Vault', icon: 'vault' },
  { key: 'generate', label: 'Generate', icon: 'dice' },
  { key: 'settings', label: 'Settings', icon: 'gear' },
];

export function LaraTabBar({
  active,
  onChange,
  insetsBottom = 0,
}: {
  active: LaraTabKey;
  onChange: (k: LaraTabKey) => void;
  insetsBottom?: number;
}) {
  return (
    <View style={[t.tabBar, { paddingBottom: insetsBottom + 8 }]}>
      {LARA_TABS.map(tab => {
        const on = tab.key === active;
        const color = on ? lc.primary : lc.textMuted;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            style={t.tab}>
            <Icon name={tab.icon} size={24} color={color} />
            <Text style={[t.tabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
