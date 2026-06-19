/**
 * TypePickerScreen (faithful redesign) — choose a category for a new item.
 *
 * Light surface; one row per item type with its tinted glyph, opening the
 * editor for that category. Presentational — App owns navigation.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr, lt, shadow } from '../../laraTheme';
import { Icon } from '../../icons';
import { TypeChip } from '../../components/lara';
import { ITEM_TYPES, TYPE_LABEL, type ItemType } from '../../model';

export type TypePickerProps = {
  onPick: (t: ItemType) => void;
  onCancel: () => void;
  insetsTop: number;
  insetsBottom: number;
};

export default function TypePickerScreen({
  onPick,
  onCancel,
  insetsTop,
  insetsBottom,
}: TypePickerProps): React.ReactElement {
  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: insetsTop + 16, paddingBottom: insetsBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <Pressable
            onPress={onCancel}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={s.back}>
            <Icon name="chevronLeft" size={22} color={lc.text} />
          </Pressable>
        </View>

        <Text style={lt.h1}>New item</Text>
        <Text style={s.subtitle}>What kind of secret are you storing?</Text>

        <View style={s.list}>
          {ITEM_TYPES.map(t => (
            <Pressable
              key={t}
              onPress={() => onPick(t)}
              style={({ pressed }) => [
                s.row,
                shadow.card,
                pressed && { backgroundColor: lc.appBg },
              ]}>
              <TypeChip type={t} size={44} />
              <Text style={s.label}>{TYPE_LABEL[t]}</Text>
              <Icon name="chevronRight" size={20} color={lc.chevron} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onCancel} style={s.cancel} hitSlop={6}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  content: { paddingHorizontal: ls.screen },

  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },

  subtitle: { ...lt.subtitle, marginTop: 4, marginBottom: 20 },

  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    padding: 14,
  },
  label: { flex: 1, fontSize: 17, fontWeight: '600', color: lc.text },

  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelText: { color: lc.slate, fontSize: 15, fontWeight: '600' },
});
