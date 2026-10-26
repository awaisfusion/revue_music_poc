import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Lucide-style icons, matching the icon set used on the RSM web app.
export type IconName = 'play' | 'pause' | 'next' | 'prev' | 'music' | 'chevronDown' | 'repeat' | 'clock';

type Props = { name: IconName; size?: number; color?: string; filled?: boolean };

export function Icon({ name, size = 24, color = colors.text, filled }: Props) {
  const fill = filled ? color : 'none';
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && <Polygon points="6 3 20 12 6 21 6 3" fill={fill} {...common} />}
      {name === 'pause' && (
        <>
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={fill} {...common} />
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={fill} {...common} />
        </>
      )}
      {name === 'next' && (
        <>
          <Polygon points="5 4 15 12 5 20 5 4" fill={fill} {...common} />
          <Line x1="19" x2="19" y1="5" y2="19" {...common} />
        </>
      )}
      {name === 'prev' && (
        <>
          <Polygon points="19 20 9 12 19 4 19 20" fill={fill} {...common} />
          <Line x1="5" x2="5" y1="19" y2="5" {...common} />
        </>
      )}
      {name === 'music' && (
        <>
          <Path d="M9 18V5l12-2v13" fill="none" {...common} />
          <Circle cx="6" cy="18" r="3" fill="none" {...common} />
          <Circle cx="18" cy="16" r="3" fill="none" {...common} />
        </>
      )}
      {name === 'chevronDown' && <Path d="m6 9 6 6 6-6" fill="none" {...common} />}
      {name === 'repeat' && (
        <>
          <Path d="m17 2 4 4-4 4" fill="none" {...common} />
          <Path d="M3 11v-1a4 4 0 0 1 4-4h14" fill="none" {...common} />
          <Path d="m7 22-4-4 4-4" fill="none" {...common} />
          <Path d="M21 13v1a4 4 0 0 1-4 4H3" fill="none" {...common} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="10" fill="none" {...common} />
          <Path d="M12 6v6l4 2" fill="none" {...common} />
        </>
      )}
    </Svg>
  );
}
