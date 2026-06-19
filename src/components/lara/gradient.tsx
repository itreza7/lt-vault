/**
 * BrandGradient / LogoMark — the blue→violet brand fill, rendered with
 * react-native-svg (no gradient library). Each BrandGradient mints a unique
 * <LinearGradient> id via useId so instances in one tree don't clash.
 */

import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle } from 'react-native-svg';

import { lr, gradient, shadow } from '../../laraTheme';
import { styles } from './styles';

/* Brand gradient fill — absolutely fills its parent. ----------------------- */
export function BrandGradient({
  radius = 0,
  style,
}: {
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''); // svg ids must be simple
  return (
    <View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
      collapsable={false}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient
            id={id}
            x1={gradient.x1}
            y1={gradient.y1}
            x2={gradient.x2}
            y2={gradient.y2}>
            <Stop offset="0" stopColor={gradient.from} />
            <Stop offset="1" stopColor={gradient.to} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={radius}
          ry={radius}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}

/* Logo mark — gradient rounded square + white shield-with-keyhole. --------- */
export function LogoMark({ size = 60 }: { size?: number }) {
  const radius = size >= 72 ? 22 : lr.logo;
  const glyph = Math.round(size * 0.53);
  return (
    <View
      style={[
        styles.logo,
        { width: size, height: size, borderRadius: radius },
        shadow.primary,
      ]}>
      <BrandGradient radius={radius} />
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2.5l7.5 3.2v5.3c0 4.9-3.2 8.4-7.5 9.7-4.3-1.3-7.5-4.8-7.5-9.7V5.7L12 2.5z"
          fill="#fff"
          fillOpacity={0.18}
          stroke="#fff"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={10.5} r={2.4} stroke="#fff" strokeWidth={1.4} />
        <Path
          d="M12 12.9v3.2"
          stroke="#fff"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
