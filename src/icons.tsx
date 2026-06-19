import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

export type IconName =
  | 'vault'
  | 'login'
  | 'password'
  | 'card'
  | 'note'
  | 'identity'
  | 'key'
  | 'shield'
  | 'gear'
  | 'search'
  | 'plus'
  | 'plusCircle'
  | 'eye'
  | 'eyeOff'
  | 'copy'
  | 'lock'
  | 'unlock'
  | 'star'
  | 'starFilled'
  | 'trash'
  | 'chevronRight'
  | 'chevronLeft'
  | 'refresh'
  | 'dice'
  | 'check'
  | 'warning'
  | 'fingerprint'
  | 'close'
  | 'share'
  | 'download'
  | 'upload'
  | 'edit'
  | 'globe'
  | 'user'
  | 'clock'
  | 'alert';

const SW = 1.8;

export function Icon({
  name,
  size = 24,
  color = '#c7a45a',
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}): React.ReactElement {
  // Shared stroke props for every line glyph.
  const s = {
    stroke: color,
    strokeWidth: SW,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  const wrap = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {children}
    </Svg>
  );

  switch (name) {
    // Safe / strongbox with a dial — the brand mark.
    case 'vault':
      return wrap(
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2.5} {...s} />
          <Circle cx={10} cy={12} r={4} {...s} />
          <Line x1={10} y1={12} x2={10} y2={8.6} {...s} />
          <Line x1={10} y1={12} x2={12.4} y2={12} {...s} />
          <Line x1={17.5} y1={9} x2={17.5} y2={15} {...s} />
        </>,
      );

    // Login = key.
    case 'login':
    case 'key':
      return wrap(
        <>
          <Circle cx={8} cy={8} r={4} {...s} />
          <Line x1={10.9} y1={10.9} x2={20} y2={20} {...s} />
          <Line x1={17.5} y1={17.5} x2={19.5} y2={15.5} {...s} />
          <Line x1={15} y1={15} x2={17} y2={13} {...s} />
        </>,
      );

    // Password = key with dots (the dots evoke a masked field).
    case 'password':
      return wrap(
        <>
          <Circle cx={7.5} cy={9.5} r={3.5} {...s} />
          <Line x1={10} y1={12} x2={18} y2={20} {...s} />
          <Line x1={16} y1={18} x2={18} y2={16} {...s} />
          <Circle cx={4} cy={20} r={1} fill={color} stroke="none" />
          <Circle cx={7.5} cy={20} r={1} fill={color} stroke="none" />
          <Circle cx={11} cy={20} r={1} fill={color} stroke="none" />
        </>,
      );

    // Credit card.
    case 'card':
      return wrap(
        <>
          <Rect x={3} y={5.5} width={18} height={13} rx={2.5} {...s} />
          <Line x1={3} y1={9.5} x2={21} y2={9.5} {...s} />
          <Line x1={6.5} y1={14.5} x2={11} y2={14.5} {...s} />
        </>,
      );

    // Document with lines.
    case 'note':
      return wrap(
        <>
          <Path d="M6 3h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" {...s} />
          <Polyline points="13 3 13 8 18 8" {...s} />
          <Line x1={8} y1={12.5} x2={16} y2={12.5} {...s} />
          <Line x1={8} y1={15.5} x2={16} y2={15.5} {...s} />
          <Line x1={8} y1={18.5} x2={13} y2={18.5} {...s} />
        </>,
      );

    // ID badge with a person.
    case 'identity':
      return wrap(
        <>
          <Rect x={4} y={4} width={16} height={16} rx={2.5} {...s} />
          <Circle cx={12} cy={10} r={2.4} {...s} />
          <Path d="M8 17c0-2.2 1.8-3.4 4-3.4s4 1.2 4 3.4" {...s} />
        </>,
      );

    // Shield (health tab).
    case 'shield':
      return wrap(
        <Path d="M12 3l7 2.6v5.2c0 4.6-3 7.8-7 9.2-4-1.4-7-4.6-7-9.2V5.6L12 3z" {...s} />,
      );

    // Settings cog.
    case 'gear':
      return wrap(
        <>
          <Circle cx={12} cy={12} r={3} {...s} />
          <Path
            d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5M18.7 18.7l-1.5-1.5M6.8 6.8L5.3 5.3"
            {...s}
          />
        </>,
      );

    // Magnifier.
    case 'search':
      return wrap(
        <>
          <Circle cx={10.5} cy={10.5} r={6} {...s} />
          <Line x1={15} y1={15} x2={20} y2={20} {...s} />
        </>,
      );

    case 'plus':
      return wrap(
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...s} />
          <Line x1={5} y1={12} x2={19} y2={12} {...s} />
        </>,
      );

    case 'plusCircle':
      return wrap(
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Line x1={12} y1={8} x2={12} y2={16} {...s} />
          <Line x1={8} y1={12} x2={16} y2={12} {...s} />
        </>,
      );

    case 'eye':
      return wrap(
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...s} />
          <Circle cx={12} cy={12} r={3} {...s} />
        </>,
      );

    case 'eyeOff':
      return wrap(
        <>
          <Path d="M4 6.5C2.9 7.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1" {...s} />
          <Path d="M9.5 5.8C10.3 5.6 11.1 5.5 12 5.5c6 0 9.5 6.5 9.5 6.5s-1 1.9-2.9 3.6" {...s} />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...s} />
          <Line x1={4} y1={4} x2={20} y2={20} {...s} />
        </>,
      );

    // Two overlapping rounded squares.
    case 'copy':
      return wrap(
        <>
          <Rect x={8.5} y={8.5} width={11} height={11} rx={2} {...s} />
          <Path d="M5.5 15.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" {...s} />
        </>,
      );

    // Padlock closed.
    case 'lock':
      return wrap(
        <>
          <Rect x={4.5} y={10.5} width={15} height={9.5} rx={2} {...s} />
          <Path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" {...s} />
          <Circle cx={12} cy={15} r={1.3} fill={color} stroke="none" />
        </>,
      );

    // Padlock open.
    case 'unlock':
      return wrap(
        <>
          <Rect x={4.5} y={10.5} width={15} height={9.5} rx={2} {...s} />
          <Path d="M7.5 10.5V8a4.5 4.5 0 0 1 8.7-1.6" {...s} />
          <Circle cx={12} cy={15} r={1.3} fill={color} stroke="none" />
        </>,
      );

    // Star outline.
    case 'star':
      return wrap(
        <Path
          d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.2-4.1 5.9-.9L12 3.5z"
          {...s}
        />,
      );

    // Star filled.
    case 'starFilled':
      return wrap(
        <Path
          d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.2-4.1 5.9-.9L12 3.5z"
          fill={color}
          stroke={color}
          strokeWidth={SW}
          strokeLinejoin="round"
        />,
      );

    // Trash can.
    case 'trash':
      return wrap(
        <>
          <Line x1={4} y1={6.5} x2={20} y2={6.5} {...s} />
          <Path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" {...s} />
          <Path d="M6 6.5l1 12.5a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-12.5" {...s} />
          <Line x1={10} y1={10.5} x2={10} y2={16.5} {...s} />
          <Line x1={14} y1={10.5} x2={14} y2={16.5} {...s} />
        </>,
      );

    case 'chevronRight':
      return wrap(<Polyline points="9 5 16 12 9 19" {...s} />);

    case 'chevronLeft':
      return wrap(<Polyline points="15 5 8 12 15 19" {...s} />);

    // Circular arrows.
    case 'refresh':
      return wrap(
        <>
          <Path d="M20 6.5v4.5h-4.5" {...s} />
          <Path d="M4 17.5v-4.5h4.5" {...s} />
          <Path d="M18.6 11A7 7 0 0 0 6.3 7.6L4 13" {...s} />
          <Path d="M5.4 13A7 7 0 0 0 17.7 16.4L20 11" {...s} />
        </>,
      );

    // Die with pips (Generate tab).
    case 'dice':
      return wrap(
        <>
          <Rect x={4} y={4} width={16} height={16} rx={3} {...s} />
          <Circle cx={8.5} cy={8.5} r={1.1} fill={color} stroke="none" />
          <Circle cx={15.5} cy={8.5} r={1.1} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.1} fill={color} stroke="none" />
          <Circle cx={8.5} cy={15.5} r={1.1} fill={color} stroke="none" />
          <Circle cx={15.5} cy={15.5} r={1.1} fill={color} stroke="none" />
        </>,
      );

    case 'check':
      return wrap(<Polyline points="4.5 12.5 9.5 17.5 19.5 6.5" {...s} />);

    // Triangle with exclamation.
    case 'warning':
      return wrap(
        <>
          <Path d="M12 4L2.8 19.5a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5L12 4z" {...s} />
          <Line x1={12} y1={10} x2={12} y2={14.5} {...s} />
          <Circle cx={12} cy={17.5} r={1.05} fill={color} stroke="none" />
        </>,
      );

    // Fingerprint arcs.
    case 'fingerprint':
      return wrap(
        <>
          <Path d="M5.5 11a6.5 6.5 0 0 1 12.9-1.2" {...s} />
          <Path d="M8.2 11a3.8 3.8 0 0 1 7.6 0c0 3 .3 5.4 1 7.2" {...s} />
          <Path d="M12 11v3.5c0 1.8.2 3.5.7 5" {...s} />
          <Path d="M5.6 13.5c.3 2 .2 4 -.6 5.7" {...s} />
          <Path d="M9.4 17.5c.2 1 .2 2 0 3" {...s} />
        </>,
      );

    case 'close':
      return wrap(
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...s} />
          <Line x1={18} y1={6} x2={6} y2={18} {...s} />
        </>,
      );

    // Share / upload arrow out of a tray.
    case 'share':
      return wrap(
        <>
          <Path d="M5 13.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.5" {...s} />
          <Line x1={12} y1={14.5} x2={12} y2={3.5} {...s} />
          <Polyline points="8 7 12 3.5 16 7" {...s} />
        </>,
      );

    // Down arrow into a tray.
    case 'download':
      return wrap(
        <>
          <Path d="M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" {...s} />
          <Line x1={12} y1={4} x2={12} y2={14.5} {...s} />
          <Polyline points="8 10.5 12 14.5 16 10.5" {...s} />
        </>,
      );

    // Up arrow from a tray.
    case 'upload':
      return wrap(
        <>
          <Path d="M5 14.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" {...s} />
          <Line x1={12} y1={4} x2={12} y2={14.5} {...s} />
          <Polyline points="8 8 12 4 16 8" {...s} />
        </>,
      );

    // Pencil.
    case 'edit':
      return wrap(
        <>
          <Path d="M14.5 5.5l4 4L8 20l-4.5 1 1-4.5L14.5 5.5z" {...s} />
          <Line x1={13} y1={7} x2={17} y2={11} {...s} />
        </>,
      );

    // Globe.
    case 'globe':
      return wrap(
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Line x1={3.5} y1={12} x2={20.5} y2={12} {...s} />
          <Path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" {...s} />
        </>,
      );

    // Person.
    case 'user':
      return wrap(
        <>
          <Circle cx={12} cy={8} r={3.8} {...s} />
          <Path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6" {...s} />
        </>,
      );

    // Clock.
    case 'clock':
      return wrap(
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Polyline points="12 7 12 12 16 14" {...s} />
        </>,
      );

    // Circle with exclamation.
    case 'alert':
      return wrap(
        <>
          <Circle cx={12} cy={12} r={8.5} {...s} />
          <Line x1={12} y1={7.5} x2={12} y2={13} {...s} />
          <Circle cx={12} cy={16.3} r={1.05} fill={color} stroke="none" />
        </>,
      );

    default:
      // Unknown name — render nothing so callers never crash.
      return <Svg width={size} height={size} viewBox="0 0 24 24" style={style} />;
  }
}
