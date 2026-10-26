import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

type Props = { uri?: string; size: number; radius?: number };

export function Artwork({ uri, size, radius = 8 }: Props) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: radius };
  if (!uri || failed) {
    return (
      <View style={[box, { backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="music" size={size * 0.4} color={colors.textFaint} />
      </View>
    );
  }
  return <Image source={{ uri }} style={[box, { backgroundColor: colors.elevated }]} onError={() => setFailed(true)} />;
}
