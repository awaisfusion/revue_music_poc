import { useState } from 'react';
import { View } from 'react-native';
import { Gradient } from './Gradient';

type Props = { ratio: number; height: number; radius?: number };

// Progress fill with the amber → orange gradient. The gradient is drawn once
// at the full bar width and revealed by a plain clipping view: resizing the
// SVG itself does not re-render on Android, so the fill stuck at its first
// width after a seek.
export function GradientFill({ ratio, height, radius = 0 }: Props) {
  const [width, setWidth] = useState(0);
  const clamped = Math.max(0, Math.min(ratio, 1));
  return (
    <View style={{ height }} onLayout={e => setWidth(e.nativeEvent.layout.width)} pointerEvents="none">
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: radius, overflow: 'hidden' }}>
        {width > 0 && <Gradient style={{ width, height }} />}
      </View>
    </View>
  );
}
