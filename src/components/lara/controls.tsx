/**
 * Controls: LaraSwitch (pill toggle), Slider (dependency-free range), and
 * StrengthBars (four-segment meter).
 */

import { useMemo, useState } from 'react';
import {
  PanResponder,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { lc } from '../../laraTheme';
import { t, d } from './styles';

/* Custom 46×28 pill toggle (matches the prototype, not the OS switch). ------ */
export function LaraSwitch({
  value,
  onValueChange,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        t.switch,
        value ? t.switchOn : t.switchOff,
        disabled && t.switchDisabled,
      ]}>
      <View style={t.knob} />
    </Pressable>
  );
}

/* Dependency-free range slider (PanResponder over a measured track). -------- */
export function Slider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const [w, setW] = useState(0);
  const ratio = max > min ? (value - min) / (max - min) : 0;

  const responder = useMemo(() => {
    const handle = (x: number) => {
      if (w <= 0) {
        return;
      }
      const r = Math.max(0, Math.min(1, x / w));
      onChange(Math.round(min + r * (max - min)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => handle(e.nativeEvent.locationX),
      onPanResponderMove: e => handle(e.nativeEvent.locationX),
    });
  }, [w, min, max, onChange]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const thumbLeft = Math.max(0, Math.min(w - 18, ratio * w - 9));

  return (
    <View style={t.sliderWrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={t.sliderTrack} />
      <View style={[t.sliderFill, { width: `${ratio * 100}%` }]} />
      <View style={[t.sliderThumb, { left: thumbLeft }]} />
    </View>
  );
}

/* Four-segment strength meter (0..4). -------------------------------------- */
const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
export function StrengthBars({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(4, Math.round(score)));
  const color =
    clamped <= 1
      ? lc.danger
      : clamped === 2
      ? lc.warning
      : clamped === 3
      ? lc.successAlt
      : lc.success;
  return (
    <View style={d.strengthWrap}>
      <View style={d.strengthBars}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              d.strengthSeg,
              { backgroundColor: i < clamped ? color : lc.border },
            ]}
          />
        ))}
      </View>
      <Text style={[d.strengthLabel, { color }]}>{STRENGTH_LABELS[clamped]}</Text>
    </View>
  );
}
