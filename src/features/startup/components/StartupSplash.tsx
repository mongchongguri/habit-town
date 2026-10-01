import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const splashBackground = require('../../../../assets/common/splash/gromi-splash-background.png');
const splashAspectRatio = 941 / 1672;
const progressBarBottomRatio = 0.196;
const progressBarWidthRatio = 0.47;
const progressSegments = 10;

type StartupSplashProps = {
  onLayout?: (event: LayoutChangeEvent) => void;
  progress: number;
};

export function StartupSplash({ onLayout, progress }: StartupSplashProps) {
  const { height, width } = useWindowDimensions();
  const artworkWidth = Math.min(width, height * splashAspectRatio);
  const artworkHeight = artworkWidth / splashAspectRatio;
  const progressBarWidth = artworkWidth * progressBarWidthRatio;
  const progressBarHeight = Math.max(22, artworkWidth * 0.052);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const normalizedProgress = Math.min(1, Math.max(0, progress));
  const segmentDividers = useMemo(
    () => Array.from({ length: progressSegments - 1 }, (_, index) => index),
    [],
  );

  useEffect(() => {
    Animated.timing(animatedProgress, {
      duration: 180,
      toValue: normalizedProgress,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, normalizedProgress]);

  const fillWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View onLayout={onLayout} style={styles.screen}>
      <View
        style={{
          height: artworkHeight,
          width: artworkWidth,
        }}
      >
        <Image resizeMode="contain" source={splashBackground} style={styles.artwork} />
        <View
          accessibilityLabel={`Loading ${Math.round(normalizedProgress * 100)}%`}
          accessibilityRole="progressbar"
          accessibilityValue={{ max: 100, min: 0, now: Math.round(normalizedProgress * 100) }}
          style={[
            styles.progressFrame,
            {
              bottom: artworkHeight * progressBarBottomRatio,
              height: progressBarHeight,
              left: (artworkWidth - progressBarWidth) / 2,
              width: progressBarWidth,
            },
          ]}
        >
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
            <View pointerEvents="none" style={styles.segmentGrid}>
              {segmentDividers.map((divider) => (
                <View key={divider} style={styles.segmentDivider} />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    height: '100%',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#59c98e',
    height: '100%',
  },
  progressFrame: {
    backgroundColor: '#fff8e8',
    borderColor: '#593426',
    borderRadius: 2,
    borderWidth: 3,
    padding: 3,
    position: 'absolute',
  },
  progressTrack: {
    backgroundColor: '#ece3d2',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: '#fffdf5',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentDivider: {
    borderColor: '#fff8e8',
    borderRightWidth: 3,
    flex: 1,
  },
  segmentGrid: {
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
