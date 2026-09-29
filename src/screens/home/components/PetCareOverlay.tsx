import { Image, ImageStyle, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type {
  CareMeterKey,
  CareMeterValues,
  RewardProgress,
} from '../../../features/rewards/rewardSystem';
import { useI18n } from '../../../features/i18n';

const fontFamily = 'Galmuri11';
const cleanBrushIcon = require('../../../../assets/images/icons/actions/clean-action-object-icon.png');
const feedBowlFullIcon = require('../../../../assets/images/icons/actions/feed-action-object-icon.png');
const playBallIcon = require('../../../../assets/images/icons/actions/play-action-object-icon.png');
const cleanlinessBubblesIcon = require('../../../../assets/images/icons/needs/cleanliness-bubbles-icon.png');
const hungerBoltIcon = require('../../../../assets/images/icons/needs/hunger-bolt-icon.png');
const lonelinessHeartBubbleIcon = require('../../../../assets/images/icons/needs/loneliness-heart-bubble-icon.png');
const coinIcon = require('../../../../assets/images/rewards/gromi-coin.png');

type CareMeterView = {
  color: string;
  icon: ImageSourcePropType;
  key: CareMeterKey;
};

type CareActionView = {
  color: string;
  icon: ImageSourcePropType;
  key: CareMeterKey;
};

const previewNeeds: CareMeterView[] = [
  { key: 'cleanliness', color: '#8fbcc0', icon: cleanlinessBubblesIcon },
  { key: 'hunger', color: '#dfb471', icon: hungerBoltIcon },
  { key: 'loneliness', color: '#e7a28f', icon: lonelinessHeartBubbleIcon },
];
const actions: CareActionView[] = [
  {
    key: 'cleanliness',
    color: '#d9ebea',
    icon: cleanBrushIcon,
  },
  {
    key: 'hunger',
    color: '#f6e3bb',
    icon: feedBowlFullIcon,
  },
  {
    key: 'loneliness',
    color: '#f3ded0',
    icon: playBallIcon,
  },
];
const bubbleActionPositions: ViewStyle[] = [
  { left: 0, top: 18 },
  { left: 64, top: 1 },
  { right: 0, top: 18 },
];
const meterSegmentCount = 9;
const portraitFaceCenterOffsetY = 8;
const pixelStyle = Platform.OS === 'web'
  ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : undefined;

/** Shows the selected pet with earned growth and care meters. */
export function PetStatusHud({
  careMeters,
  onPressPet,
  petImage,
  petName,
  progress,
  roomName,
}: {
  careMeters: CareMeterValues;
  onPressPet?: () => void;
  petImage: ImageSourcePropType;
  petName: string;
  progress: RewardProgress;
  roomName: string;
}) {
  const { language, t } = useI18n();
  const locale = language === 'ko' ? 'ko-KR' : 'en-US';
  const portraitContent = (
    <>
      <View style={styles.ringInnerShadow} />
      <View style={styles.portrait}>
        <Image source={petImage} accessibilityLabel={t('pet.a11y.image', { name: petName })}
          resizeMode="contain" style={[styles.petImage, pixelStyle]} />
      </View>
    </>
  );

  return (
    <View style={styles.top} pointerEvents="box-none">
      <View style={styles.statusPanel}>
        <View style={styles.portraitColumn}>
          {onPressPet ? (
            <Pressable style={styles.ring} accessibilityRole="button"
              accessibilityLabel={t('pet.a11y.status', { name: petName })} onPress={onPressPet}>
              {portraitContent}
            </Pressable>
          ) : (
            <View style={styles.ring} accessibilityLabel={t('pet.a11y.image', { name: petName })}>
              {portraitContent}
            </View>
          )}
        </View>
        <View style={styles.meters}>
          {previewNeeds.map((need) => {
            const value = careMeters[need.key];
            const filledSegments = value * meterSegmentCount;

            return <View key={need.key} style={styles.meterRow}
              accessibilityRole="progressbar" accessibilityLabel={t(`care.meter.${need.key}`)}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
              <Image source={need.icon} resizeMode="contain" style={[styles.meterIcon, pixelStyle]} />
              <View style={styles.track}>
                {Array.from({ length: meterSegmentCount }, (_, index) => (
                  <View key={index} style={styles.meterSegment}>
                    {filledSegments > index ? (
                      <View style={[
                        styles.meterSegmentFill,
                        {
                          backgroundColor: need.color,
                          width: `${Math.min(1, filledSegments - index) * 100}%`,
                        },
                      ]}>
                        <View style={styles.highlight} />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>;
          })}
        </View>
      </View>
      <View style={styles.roomSummary} accessibilityLabel={roomName}>
        <View style={styles.currency} accessibilityLabel={`${t('common.currency')} ${progress.coins}`}>
          <Image accessibilityIgnoresInvertColors source={coinIcon} resizeMode="contain" style={[styles.coinIcon, pixelStyle]} />
          <Text style={styles.currencyText}>{progress.coins.toLocaleString(locale)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Bottom care actions open the matching care item flow. */
export function PetCareActions({
  onCareAction,
}: {
  onCareAction: (meter: CareMeterKey) => void;
}) {
  const { t } = useI18n();

  return (
    <View style={styles.bottom} pointerEvents="box-none">
      <View style={styles.actions}>
        {actions.map((action) => {
          const label = t(`care.action.${action.key}`);

          return (
            <Pressable key={action.key} accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onCareAction(action.key)}
              style={[styles.action, { backgroundColor: action.color }]}>
              <View style={styles.actionHighlight} />
              {action.icon ? (
                <Image source={action.icon} accessibilityLabel={label} resizeMode="contain" style={styles.actionIcon} />
              ) : (
                <Text style={styles.actionLabel}>{label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Pet-side bubble actions open the matching care item flow. */
export function PetCareBubbleActions({
  horizontalOffset = 0,
  onCareAction,
  visible,
}: {
  horizontalOffset?: number;
  onCareAction: (meter: CareMeterKey) => void;
  visible: boolean;
}) {
  const { t } = useI18n();

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bubbleMenu, { transform: [{ translateX: horizontalOffset }] }]}
    >
      {actions.map((action, index) => {
        const label = t(`care.action.${action.key}`);

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            key={action.key}
            onPress={() => onCareAction(action.key)}
            style={({ pressed }) => [
              styles.bubbleAction,
              bubbleActionPositions[index],
              { backgroundColor: action.color },
              pressed && styles.bubbleActionPressed,
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              source={action.icon}
              accessibilityLabel={label}
              resizeMode="contain"
              style={styles.bubbleActionIcon}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 249, 233, 0.96)',
    borderBottomColor: '#795c43',
    borderBottomWidth: 2,
    borderTopColor: '#795c43',
    borderTopWidth: 2,
    flexDirection: 'row',
    gap: 8,
    height: 94,
    justifyContent: 'space-between',
    left: 0,
    paddingBottom: 7,
    paddingHorizontal: 8,
    paddingTop: 7,
    position: 'absolute',
    right: 0,
    shadowColor: '#765438',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    top: 0,
    zIndex: 10,
  },
  statusPanel: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: 360,
    minWidth: 0,
  },
  portraitColumn: { alignItems: 'center', width: 60 },
  ring: {
    backgroundColor: '#fffdf6',
    borderColor: '#624936',
    borderRadius: 4,
    borderWidth: 2,
    height: 60,
    shadowColor: '#6a4932',
    shadowOffset: { height: 3, width: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    width: 60,
  },
  ringInnerShadow: {
    borderColor: '#e5d8b9',
    borderRadius: 2,
    borderWidth: 2,
    bottom: 4,
    left: 4,
    position: 'absolute',
    right: 4,
    top: 4,
  },
  portrait: {
    alignItems: 'center',
    backgroundColor: '#fffaf0',
    borderColor: '#624936',
    borderRadius: 2,
    borderWidth: 1,
    bottom: 5,
    justifyContent: 'center',
    left: 5,
    overflow: 'hidden',
    position: 'absolute',
    right: 5,
    top: 5,
  },
  petImage: {
    flexShrink: 0,
    height: 82,
    transform: [{ translateY: portraitFaceCenterOffsetY }],
    width: 82,
  },
  meters: { flex: 1, gap: 7, maxWidth: 240, minWidth: 140 },
  meterRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  meterIcon: { height: 20, width: 20 },
  track: {
    backgroundColor: '#fffdf6',
    borderColor: '#795c43',
    borderWidth: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 1,
    height: 16,
    padding: 2,
  },
  meterSegment: { backgroundColor: '#f0eadc', flex: 1, minWidth: 2, overflow: 'hidden' },
  meterSegmentFill: { height: '100%' },
  highlight: { height: 2, backgroundColor: 'rgba(255,255,255,0.42)', width: '100%' },
  roomSummary: {
    alignItems: 'flex-end',
    flexShrink: 0,
    justifyContent: 'center',
    minWidth: 82,
    paddingRight: 1,
  },
  currency: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    backgroundColor: '#fff8ea',
    borderColor: '#795c43',
    borderWidth: 2,
    gap: 4,
    height: 34,
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
    shadowColor: '#765438',
    shadowOffset: { height: 3, width: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
  },
  currencyText: { fontFamily, fontSize: 11, fontWeight: '900', color: '#604832' },
  coinIcon: { height: 22, width: 22 },
  bottom: { position: 'absolute', bottom: 14, left: 16, right: 16, alignItems: 'center', zIndex: 10 },
  actions: { flexDirection: 'row', width: '100%', maxWidth: 390, gap: 10 },
  action: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5, borderColor: '#795c43', paddingVertical: 8 },
  actionHighlight: { position: 'absolute', top: 2, left: 2, right: 2, height: 2, backgroundColor: '#fffaf0' },
  actionIcon: { width: 48, height: 42 },
  actionLabel: { fontFamily, fontSize: 11, color: '#49372a' },
  bubbleAction: {
    alignItems: 'center',
    borderColor: '#6f4a36',
    borderRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    width: 56,
    zIndex: 21,
  },
  bubbleActionIcon: { height: 38, width: 42 },
  bubbleActionPressed: {
    borderColor: '#9b5545',
    borderBottomWidth: 2,
    transform: [{ translateY: 1 }, { scale: 0.96 }],
  },
  bubbleMenu: {
    height: 76,
    left: '50%',
    marginLeft: -92,
    position: 'absolute',
    top: -82,
    width: 184,
    zIndex: 20,
  },
});
