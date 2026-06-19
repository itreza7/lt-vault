/**
 * ItemDetailScreen (faithful redesign) — read view for a single vault item.
 *
 * Light surface. Secrets stay masked until tapped; copying routes through
 * copyWithAutoClear (30s clipboard wipe). A login's TOTP secret is never shown
 * raw — it drives a live one-time code with a countdown ring. Presentational:
 * App owns persistence.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { lc, ls, lr, lt, mono } from '../../laraTheme';
import {
  LaraCard,
  LaraDetailRow,
  LaraIconButton,
  TypeChip,
} from '../../components/lara';
import { FIELDS, TYPE_LABEL, type Item } from '../../model';
import { copyWithAutoClear, CLIPBOARD_CLEAR_SECONDS } from '../../clipboard';
import {
  generateTotp,
  isValidBase32Secret,
  totpRemainingSeconds,
} from '../../totp';

export type ItemDetailProps = {
  item: Item;
  busy?: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onBack: () => void;
  insetsTop: number;
  insetsBottom: number;
};

const COPIED_MESSAGE = `Copied — clears in ${CLIPBOARD_CLEAR_SECONDS}s`;

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function groupCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/* Live one-time code row with a countdown ring. */
function TotpRow({ secret, onCopied }: { secret: string; onCopied: () => void }) {
  const period = 30;
  const [code, setCode] = useState(() => generateTotp(secret, { period }));
  const [remaining, setRemaining] = useState(() => totpRemainingSeconds(period));

  useEffect(() => {
    const tick = () => {
      setCode(generateTotp(secret, { period }));
      setRemaining(totpRemainingSeconds(period));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [secret]);

  const ringSize = 34;
  const stroke = 3;
  const r = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = remaining / period;
  const ringColor = remaining <= 5 ? lc.warning : lc.primary;

  return (
    <View style={s.detailRow}>
      <View style={s.detailMain}>
        <Text style={s.detailLabel}>One-time code</Text>
        <Text style={s.totpCode} selectable>
          {groupCode(code)}
        </Text>
      </View>
      <View style={s.detailActions}>
        <View style={s.totpRing}>
          <Svg width={ringSize} height={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke={lc.border}
              strokeWidth={stroke}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circ * frac} ${circ - circ * frac}`}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <Text style={[s.totpCount, { color: ringColor }]}>{remaining}</Text>
        </View>
        <LaraIconButton
          name="copy"
          onPress={() => {
            copyWithAutoClear(code);
            onCopied();
          }}
          color={lc.primary}
          size={20}
          accessibilityLabel="Copy one-time code"
        />
      </View>
    </View>
  );
}

export default function ItemDetailScreen({
  item,
  busy = false,
  onEdit,
  onToggleFavorite,
  onDelete,
  onBack,
  insetsTop,
  insetsBottom,
}: ItemDetailProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const flashCopied = () => {
    setCopied(true);
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = setTimeout(() => setCopied(false), 2600);
  };

  const copyValue = (value: string) => {
    copyWithAutoClear(value);
    flashCopied();
  };

  const specs = FIELDS[item.type];
  const isLogin = item.type === 'login';

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
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
            onPress={onBack}
            color={lc.text}
            accessibilityLabel="Back"
          />
          <View style={s.spacer} />
          <LaraIconButton
            name={item.favorite ? 'starFilled' : 'star'}
            onPress={onToggleFavorite}
            color={item.favorite ? lc.warning : lc.textMuted}
            active={item.favorite}
            accessibilityLabel={
              item.favorite ? 'Remove from favorites' : 'Add to favorites'
            }
          />
          <LaraIconButton
            name="edit"
            onPress={onEdit}
            color={lc.primary}
            accessibilityLabel="Edit"
          />
        </View>

        <View style={s.identity}>
          <TypeChip type={item.type} size={64} />
          <Text style={s.title}>{item.title || 'Untitled'}</Text>
          <View style={s.typeRow}>
            <Text style={s.typeLabel}>{TYPE_LABEL[item.type]}</Text>
            {item.category ? (
              <View style={s.catBadge}>
                <Text style={s.catBadgeText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {copied ? (
          <View style={s.copied}>
            <Text style={s.copiedText}>{COPIED_MESSAGE}</Text>
          </View>
        ) : null}

        <LaraCard style={s.fieldsCard}>
          {specs.map(spec => {
            const value = item.fields[spec.key];
            if (!value) {
              return null;
            }
            if (isLogin && spec.key === 'totp' && isValidBase32Secret(value)) {
              return <TotpRow key={spec.key} secret={value} onCopied={flashCopied} />;
            }
            return (
              <LaraDetailRow
                key={spec.key}
                label={spec.label}
                value={value}
                secret={spec.secret}
                monoFace={spec.mono}
                onCopy={() => copyValue(value)}
              />
            );
          })}
          {(item.custom ?? [])
            .filter(f => f.label.trim() || f.value)
            .map((f, i) => (
              <LaraDetailRow
                key={`custom-${i}`}
                label={f.label.trim() || 'Field'}
                value={f.value}
                secret={f.secret}
                onCopy={f.value ? () => copyValue(f.value) : undefined}
              />
            ))}
        </LaraCard>

        {item.note && item.note.trim() ? (
          <>
            <Text style={s.section}>NOTE</Text>
            <LaraCard style={s.noteCard}>
              <Text style={s.note} selectable>
                {item.note}
              </Text>
            </LaraCard>
          </>
        ) : null}

        <View style={s.footer}>
          <Text style={s.meta}>Created {formatDate(item.createdAt)}</Text>
          <Text style={s.meta}>Updated {formatDate(item.updatedAt)}</Text>
        </View>

        {confirming ? (
          <View style={s.confirm}>
            <Text style={s.confirmText}>
              Delete this item? This can’t be undone.
            </Text>
            <Pressable
              onPress={onDelete}
              disabled={busy}
              style={({ pressed }) => [
                s.deleteBtn,
                pressed && !busy && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}>
              <Text style={s.deleteText}>{busy ? 'Deleting…' : 'Delete'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirming(false)}
              disabled={busy}
              style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            disabled={busy}
            style={({ pressed }) => [s.dangerBtn, pressed && { opacity: 0.85 }]}>
            <Text style={s.dangerText}>Delete item</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  content: { paddingHorizontal: ls.screen },

  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spacer: { flex: 1 },

  identity: { alignItems: 'center', gap: 12, marginBottom: 22 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: lc.text,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: lc.textMuted,
  },
  catBadge: {
    backgroundColor: lc.tintViolet,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: lr.pill,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700', color: lc.secondary },

  copied: {
    backgroundColor: lc.tintBlue,
    borderRadius: lr.field,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  copiedText: { color: lc.primary, fontSize: 13, fontWeight: '600' },

  fieldsCard: { paddingHorizontal: 16, paddingVertical: 2 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: lc.divider,
    gap: 12,
  },
  detailMain: { flex: 1, minWidth: 0 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: lc.primary,
    marginBottom: 3,
  },
  detailActions: { flexDirection: 'row', alignItems: 'center' },
  totpCode: { fontFamily: mono, fontSize: 22, letterSpacing: 2, color: lc.text },
  totpRing: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  totpCount: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: mono,
  },

  section: { ...lt.label, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  noteCard: { padding: 16 },
  note: { fontSize: 15, lineHeight: 22, color: lc.text },

  footer: { marginTop: 22, marginBottom: 16, gap: 2 },
  meta: { fontSize: 12, color: lc.textMuted },

  dangerBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: lc.dangerAlt, fontSize: 15, fontWeight: '700' },

  confirm: {
    backgroundColor: lc.card,
    borderRadius: lr.card,
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 16,
    gap: 12,
  },
  confirmText: { fontSize: 15, lineHeight: 21, color: lc.text },
  deleteBtn: {
    height: 50,
    borderRadius: lr.field,
    backgroundColor: lc.dangerAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: lc.slate, fontSize: 15, fontWeight: '600' },
});
