/**
 * VaultListScreen (faithful redesign) — browse stored items.
 *
 * Light surface, gradient header "+" button, live search, category chips, and a
 * single white list card whose rows show a colored letter avatar, title, the
 * subtitle line, an amber dot for weak passwords, and a chevron. Wired to the
 * real vault: avatar colors are derived deterministically from the title and
 * weakness is computed with the same scorePassword used by the health audit.
 *
 * Presentational only — App owns persistence and navigation.
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr, lt, avatarPalette } from '../../laraTheme';
import { Icon } from '../../icons';
import {
  BrandGradient,
  LaraCard,
  LaraChip,
  LetterAvatar,
  SearchField,
} from '../../components/lara';
import {
  ITEM_TYPES,
  TYPE_LABEL_PLURAL,
  subtitleFor,
  passwordOf,
  categoriesOf,
  type Item,
  type ItemType,
} from '../../model';
import { scorePassword } from '../../passwordGen';

export type VaultListScreenProps = {
  items: Item[];
  onOpenItem: (id: string) => void;
  onAddItem: () => void;
  insetsTop: number;
};

type Filter =
  | { kind: 'all' }
  | { kind: 'type'; type: ItemType }
  | { kind: 'category'; name: string };

/** Stable avatar color from the title (real data has no brand palette). */
function avatarColor(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) {
    h = (h * 31 + title.charCodeAt(i)) % 1000000007;
  }
  return avatarPalette[h % avatarPalette.length];
}

/** First letter for the avatar — prefer an alphanumeric, else a placeholder. */
function avatarLetter(title: string): string {
  const m = title.match(/[a-z0-9]/i);
  return (m ? m[0] : title.trim()[0] || '•').toUpperCase();
}

export default function VaultListScreen({
  items,
  onOpenItem,
  onAddItem,
  insetsTop,
}: VaultListScreenProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });

  // Which types are present, in canonical order (drives the chip row).
  const presentTypes = useMemo(
    () => ITEM_TYPES.filter(t => items.some(it => it.type === t)),
    [items],
  );

  // Distinct user categories, sorted (the second group of filter chips).
  const categories = useMemo(() => categoriesOf(items), [items]);

  // Flag items whose password material is weak (same rule as the audit).
  const weakIds = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const pw = passwordOf(it);
      if (pw && scorePassword(pw) <= 1) {
        set.add(it.id);
      }
    }
    return set;
  }, [items]);

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(it => {
        if (filter.kind === 'type' && it.type !== filter.type) {
          return false;
        }
        if (filter.kind === 'category' && (it.category ?? '') !== filter.name) {
          return false;
        }
        if (!q) {
          return true;
        }
        return (
          it.title.toLowerCase().includes(q) ||
          subtitleFor(it).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, query, filter]);

  const sectionLabel = searching
    ? 'Results'
    : filter.kind === 'all'
    ? 'Recently used'
    : filter.kind === 'type'
    ? TYPE_LABEL_PLURAL[filter.type]
    : filter.name;

  const subtitle = `${items.length} ${
    items.length === 1 ? 'item' : 'items'
  } · on this device`;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insetsTop + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={lt.h1}>Vault</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </View>
          <Pressable
            onPress={onAddItem}
            accessibilityRole="button"
            accessibilityLabel="Add item"
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addPressed,
            ]}>
            <BrandGradient radius={13} />
            <Icon name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <EmptyVault onAdd={onAddItem} />
        ) : (
          <>
            <View style={styles.searchWrap}>
              <SearchField value={query} onChangeText={setQuery} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}>
              <LaraChip
                label="All"
                active={filter.kind === 'all'}
                onPress={() => setFilter({ kind: 'all' })}
              />
              {presentTypes.map(t => (
                <LaraChip
                  key={t}
                  label={TYPE_LABEL_PLURAL[t]}
                  active={filter.kind === 'type' && filter.type === t}
                  onPress={() => setFilter({ kind: 'type', type: t })}
                />
              ))}
              {categories.map(c => (
                <LaraChip
                  key={`cat-${c}`}
                  label={c}
                  active={filter.kind === 'category' && filter.name === c}
                  onPress={() => setFilter({ kind: 'category', name: c })}
                />
              ))}
            </ScrollView>

            <Text style={styles.section}>{sectionLabel}</Text>

            {visible.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsTitle}>Nothing matches</Text>
                <Text style={styles.noResultsBody}>
                  {searching
                    ? `No items match “${query.trim()}”. Try a different search.`
                    : 'No items in this category yet.'}
                </Text>
              </View>
            ) : (
              <LaraCard style={styles.list}>
                {visible.map((item, i) => (
                  <Pressable
                    key={item.id}
                    onPress={() => onOpenItem(item.id)}
                    style={({ pressed }) => [
                      styles.row,
                      i < visible.length - 1 && styles.rowDivider,
                      pressed && styles.rowPressed,
                    ]}>
                    <LetterAvatar
                      letter={avatarLetter(item.title || '?')}
                      color={avatarColor(item.title || item.id)}
                    />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title || 'Untitled'}
                      </Text>
                      <View style={styles.rowSubLine}>
                        {item.category ? (
                          <View style={styles.rowCat}>
                            <Text style={styles.rowCatText} numberOfLines={1}>
                              {item.category}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {subtitleFor(item)}
                        </Text>
                      </View>
                    </View>
                    {weakIds.has(item.id) ? (
                      <View style={styles.weakDot} />
                    ) : null}
                    <Icon name="chevronRight" size={18} color={lc.chevron} />
                  </Pressable>
                ))}
              </LaraCard>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* Empty-vault invitation. -------------------------------------------------- */
function EmptyVault({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name="vault" size={30} color={lc.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your vault is empty</Text>
      <Text style={styles.emptyBody}>
        Add your first login, card or note. Everything stays encrypted on this
        device.
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.emptyBtn, pressed && styles.addPressed]}>
        <BrandGradient radius={lr.field} />
        <Icon name="plus" size={18} color="#fff" />
        <Text style={styles.emptyBtnText}>Add item</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  content: {
    paddingHorizontal: ls.screen,
    paddingBottom: 32,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1 },
  headerSub: { ...lt.subtitle, marginTop: 5 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addPressed: { transform: [{ scale: 0.92 }] },

  searchWrap: { marginTop: 20 },
  chips: { flexDirection: 'row', gap: 9, marginTop: 16, paddingBottom: 2 },

  section: { ...lt.label, marginTop: 24, marginBottom: 12, marginLeft: 2 },

  list: { overflow: 'hidden', padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: lc.divider },
  rowPressed: { backgroundColor: lc.appBg },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { ...lt.rowTitle },
  rowSubLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  rowCat: {
    backgroundColor: lc.tintViolet,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 6,
    maxWidth: 130,
  },
  rowCatText: { fontSize: 11, fontWeight: '700', color: lc.secondary },
  rowSub: { fontSize: 13, color: lc.textMuted, flexShrink: 1 },
  weakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: lc.warning,
  },

  noResults: {
    backgroundColor: lc.card,
    borderRadius: lr.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 6,
  },
  noResultsTitle: { fontSize: 16, fontWeight: '700', color: lc.text },
  noResultsBody: {
    fontSize: 14,
    lineHeight: 20,
    color: lc.textMuted,
    textAlign: 'center',
  },

  empty: {
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: lc.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: lc.ink },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: lc.textSub,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: lr.field,
    overflow: 'hidden',
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
