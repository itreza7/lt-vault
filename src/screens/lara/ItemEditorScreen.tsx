/**
 * ItemEditorScreen (faithful redesign) — create or edit a vault item.
 *
 * Light surface. Seeds local state from `initial`, hands a fully-formed Item to
 * onSave; App owns persistence. Password-bearing fields get an inline generator
 * and a live strength meter; secrets stay masked + revealable.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr } from '../../laraTheme';
import { Icon } from '../../icons';
import {
  GradientButton,
  LaraChip,
  LaraField,
  LaraIconButton,
  LaraSwitch,
  SectionLabel,
  StrengthBars,
} from '../../components/lara';
import {
  FIELDS,
  TYPE_LABEL,
  type CustomField,
  type Item,
} from '../../model';
import {
  DEFAULT_GEN_OPTIONS,
  generatePassword,
  scorePassword,
} from '../../passwordGen';

export type ItemEditorProps = {
  initial: Item;
  busy?: boolean;
  onSave: (item: Item) => void;
  onCancel: () => void;
  existingCategories: string[];
  insetsTop: number;
  insetsBottom: number;
};

function passwordKeyFor(type: Item['type']): string | null {
  if (type === 'login') {
    return 'password';
  }
  if (type === 'password') {
    return 'value';
  }
  return null;
}

export default function ItemEditorScreen({
  initial,
  busy = false,
  onSave,
  onCancel,
  existingCategories,
  insetsTop,
  insetsBottom,
}: ItemEditorProps): React.ReactElement {
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category ?? '');
  const [fields, setFields] = useState<Record<string, string>>({
    ...initial.fields,
  });
  const [custom, setCustom] = useState<CustomField[]>(
    initial.custom ? initial.custom.map(f => ({ ...f })) : [],
  );
  const [note, setNote] = useState(initial.note ?? '');
  const [favorite, setFavorite] = useState(initial.favorite);
  const [error, setError] = useState<string | null>(null);

  const specs = FIELDS[initial.type];
  const pwKey = passwordKeyFor(initial.type);
  const isEditing = !!initial.title;
  const categorySuggestions = existingCategories.filter(
    c => c.toLowerCase() !== category.trim().toLowerCase(),
  );

  const setField = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }));

  const generateInto = (key: string) =>
    setField(key, generatePassword(DEFAULT_GEN_OPTIONS));

  const updateCustom = (index: number, patch: Partial<CustomField>) =>
    setCustom(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const addCustom = () => setCustom(prev => [...prev, { label: '', value: '' }]);

  const removeCustom = (index: number) =>
    setCustom(prev => prev.filter((_, i) => i !== index));

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give this item a name.');
      return;
    }
    setError(null);
    const cleanedCustom = custom.filter(f => f.label.trim() || f.value.trim());
    onSave({
      ...initial,
      title: trimmed,
      category: category.trim() || undefined,
      fields,
      custom: cleanedCustom.length ? cleanedCustom : undefined,
      note,
      favorite,
      updatedAt: Date.now(),
    });
  };

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <KeyboardAvoidingView
        style={s.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingTop: insetsTop + 8, paddingBottom: insetsBottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={s.topBar}>
            <LaraIconButton
              name="chevronLeft"
              onPress={onCancel}
              color={lc.text}
              accessibilityLabel="Cancel"
            />
            <Text style={s.title}>
              {isEditing ? 'Edit item' : `New ${TYPE_LABEL[initial.type]}`}
            </Text>
          </View>

          <LaraField
            label="Name"
            value={title}
            onChangeText={t => {
              setTitle(t);
              if (error) {
                setError(null);
              }
            }}
            placeholder="What is this?"
          />

          <LaraField
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="Optional — e.g. Work, Personal"
          />
          {categorySuggestions.length > 0 ? (
            <View style={s.catChips}>
              {categorySuggestions.map(c => (
                <LaraChip key={c} label={c} onPress={() => setCategory(c)} />
              ))}
            </View>
          ) : null}

          {specs.map(spec => {
            const value = fields[spec.key] ?? '';
            const isPasswordField = spec.key === pwKey;
            return (
              <View key={spec.key}>
                <LaraField
                  label={spec.label}
                  value={value}
                  onChangeText={t => setField(spec.key, t)}
                  placeholder={spec.placeholder}
                  secure={spec.secret}
                  mono={spec.mono}
                  multiline={spec.multiline}
                  keyboard={spec.keyboard}
                />
                {isPasswordField ? (
                  <View style={s.pwControls}>
                    <View style={s.pwStrength}>
                      {value ? <StrengthBars score={scorePassword(value)} /> : null}
                    </View>
                    <Pressable
                      onPress={() => generateInto(spec.key)}
                      style={({ pressed }) => [
                        s.genBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      hitSlop={6}>
                      <Icon name="refresh" size={16} color={lc.primary} />
                      <Text style={s.genText}>Generate</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}

          <SectionLabel>Custom fields</SectionLabel>
          {custom.map((f, i) => (
            <View key={`custom-${i}`} style={s.customGroup}>
              <View style={s.customHead}>
                <Text style={s.customTitle}>Field {i + 1}</Text>
                <LaraIconButton
                  name="trash"
                  onPress={() => removeCustom(i)}
                  color={lc.danger}
                  size={18}
                  accessibilityLabel="Remove field"
                />
              </View>
              <LaraField
                label="Label"
                value={f.label}
                onChangeText={t => updateCustom(i, { label: t })}
                placeholder="e.g. Recovery email"
              />
              <LaraField
                label="Value"
                value={f.value}
                onChangeText={t => updateCustom(i, { value: t })}
                secure={f.secret}
              />
            </View>
          ))}
          <Pressable
            onPress={addCustom}
            style={({ pressed }) => [s.addField, pressed && { opacity: 0.8 }]}>
            <Icon name="plus" size={18} color={lc.primary} />
            <Text style={s.addFieldText}>Add field</Text>
          </Pressable>

          <View style={s.spaced}>
            <LaraField
              label="Note"
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Anything else worth remembering"
            />
          </View>

          <View style={s.favoriteRow}>
            <Text style={s.favoriteLabel}>Favorite</Text>
            <LaraSwitch value={favorite} onValueChange={setFavorite} />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <GradientButton label="Save" onPress={save} busy={busy} />
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={s.cancel}
            hitSlop={6}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  fill: { flex: 1 },
  content: { paddingHorizontal: ls.screen },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: lc.text },

  catChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },

  pwControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -8,
    marginBottom: 16,
  },
  pwStrength: { flex: 1 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  genText: { color: lc.primary, fontSize: 14, fontWeight: '700' },

  customGroup: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    padding: 14,
    marginBottom: 12,
  },
  customHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customTitle: { fontSize: 13, fontWeight: '700', color: lc.slate },

  addField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: lr.field,
    borderWidth: 1,
    borderColor: lc.border,
    backgroundColor: lc.card,
    marginBottom: 16,
  },
  addFieldText: { color: lc.primary, fontSize: 15, fontWeight: '700' },

  spaced: { marginTop: 4 },

  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: lc.card,
    borderRadius: lr.field,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  favoriteLabel: { fontSize: 16, fontWeight: '600', color: lc.text },

  error: { color: lc.danger, fontSize: 14, lineHeight: 20, marginBottom: 12 },

  cancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: lc.slate, fontSize: 15, fontWeight: '600' },
});
