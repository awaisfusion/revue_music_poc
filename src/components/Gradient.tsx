import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { gradient } from '../theme';

type Props = {
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
  radius?: number;
  children?: ReactNode;
};

// Amber → orange gradient fill used for the logo badge and primary buttons.
export function Gradient({ colors = gradient.button, style, radius = 0, children }: Props) {
  const id = useId().replace(/:/g, '');
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {colors.map((c, i) => (
              <Stop key={c} offset={i / (colors.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
