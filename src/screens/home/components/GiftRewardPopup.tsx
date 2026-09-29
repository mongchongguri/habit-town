import {
  Image,
  ImageStyle,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { PopupCloseButton } from '../../../components/common/PopupCloseButton';
import { rewardRarityLabels, useI18n } from '../../../features/i18n';
import { getLocalizedInventoryItem, getLocalizedItemName } from '../../../features/items/localizedItems';
import { DeliveryReward } from '../../../features/rewards/eventRewards';
import { formatCountdown } from '../../../features/rewards/useHourlyDelivery';

const coinIcon = require('../../../../assets/images/rewards/gromi-coin.png');
const giftIcon = require('../../../../assets/images/rewards/animal-rescue-reward-gift-box.png');
const pixelFontFamily = 'Galmuri11';
const pixelatedImageStyle =
  Platform.OS === 'web'
    ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle)
    : null;
type GiftRewardPopupProps = {
  giftBoxCount: number;
  isBusy: boolean;
  onClose: () => void;
  onOpenBox: () => void;
  reward: DeliveryReward | null;
  secondsUntilNext: number | null;
  visible: boolean;
  width: number;
};

export function GiftRewardPopup({
  giftBoxCount,
  isBusy,
  onClose,
  onOpenBox,
  reward,
  secondsUntilNext,
  visible,
  width,
}: GiftRewardPopupProps) {
  const { t } = useI18n();

  if (!visible) {
    return null;
  }

  const canOpenGiftBox = giftBoxCount > 0 && !reward;
  const nextGiftCountdown = secondsUntilNext === null
    ? t('gift.checking')
    : formatCountdown(secondsUntilNext);

  return (
    <View style={styles.popupLayer}>
      <TouchableWithoutFeedback onPress={isBusy ? undefined : onClose}>
        <View style={styles.popupBackdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.popupFrame, { width }]}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>GIFT REWARD</Text>
                <Text style={styles.title}>{t('gift.rewardTitle')}</Text>
              </View>
              <PopupCloseButton
                accessibilityLabel={t('gift.close')}
                disabled={isBusy}
                onPress={onClose}
              />
            </View>

            <View style={styles.content}>
              <View style={styles.giftStage}>
                <View style={styles.giftBoxStage}>
                  <Image
                    accessibilityIgnoresInvertColors
                    source={giftIcon}
                    resizeMode="contain"
                    style={styles.giftImage}
                  />
                  {giftBoxCount > 1 ? (
                    <View style={styles.giftCountBadge}>
                      <Text style={styles.giftCountText}>x{giftBoxCount}</Text>
                    </View>
                  ) : null}
                </View>
                {reward ? (
                  <RewardCard reward={reward} />
                ) : (
                  <View style={styles.rewardCard}>
                    <Text style={styles.cardEyebrow}>UNOPENED</Text>
                    <Text style={styles.rewardTitle}>
                      {giftBoxCount > 0 ? t('gift.boxReady') : t('gift.boxEmpty')}
                    </Text>
                    <Text style={styles.rewardDescription}>
                      {giftBoxCount > 0
                        ? t('gift.boxReadyDescription')
                        : t('gift.boxEmptyDescription')}
                    </Text>
                    <View style={styles.countdownRow}>
                      <Text style={styles.countdownLabel}>{t('gift.nextGift')}</Text>
                      <Text style={styles.countdownValue}>{nextGiftCountdown}</Text>
                    </View>
                  </View>
                )}
              </View>

              {reward ? (
                <Pressable
                  accessibilityLabel={t('gift.confirmReward')}
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={onClose}
                  style={[styles.actionButton, styles.confirmButton]}
                >
                  <Text style={styles.claimText}>{t('actions.confirm')}</Text>
                </Pressable>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityLabel={t('gift.close')}
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={onClose}
                    style={[styles.actionButton, styles.closeRewardButton]}
                  >
                    <Text style={styles.closeRewardText}>{t('actions.later')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('gift.openWithAd')}
                    accessibilityRole="button"
                    disabled={isBusy || !canOpenGiftBox}
                    onPress={onOpenBox}
                    style={[
                      styles.actionButton,
                      styles.claimButton,
                      !canOpenGiftBox ? styles.actionButtonDisabled : null,
                    ]}
                  >
                    <Text style={styles.claimText}>{isBusy ? t('gift.checking') : t('actions.openGiftWithAd')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function RewardCard({ reward }: { reward: DeliveryReward }) {
  const { language, t } = useI18n();
  const detail = reward.kind === 'currency'
    ? t('common.rewardCurrency', {
      amount: reward.amount.toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US'),
    })
    : `${getLocalizedInventoryItem(reward.item, t).name} x${reward.item.quantity}`;
  const description = reward.kind === 'currency'
    ? t('gift.currencyDescription')
    : getLocalizedInventoryItem(reward.item, t).description;

  return (
    <View style={styles.rewardCard}>
      <Text style={styles.cardEyebrow}>{rewardRarityLabels[reward.rarity]}</Text>
      <Text style={styles.rewardTitle}>{getLocalizedItemName(reward, t)}</Text>
      <RewardDetail reward={reward} text={detail} />
      <Text style={styles.rewardDescription}>{description}</Text>
    </View>
  );
}

function RewardDetail({ reward, text }: { reward: DeliveryReward; text: string }) {
  if (reward.kind !== 'currency') {
    return <Text style={styles.rewardAmount}>{text}</Text>;
  }

  return (
    <View style={styles.rewardAmountRow}>
      <Image
        accessibilityIgnoresInvertColors
        source={coinIcon}
        resizeMode="contain"
        style={[styles.coinIcon, pixelatedImageStyle]}
      />
      <Text style={styles.rewardAmount}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionButtonDisabled: {
    backgroundColor: '#c8a889',
    borderColor: '#8d7460',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  cardEyebrow: {
    color: '#b36b31',
    fontFamily: pixelFontFamily,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  claimButton: {
    backgroundColor: '#b96335',
    borderColor: '#6b321f',
    flex: 1.35,
  },
  claimText: {
    color: '#fff8ea',
    fontFamily: pixelFontFamily,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#ffd99e',
    borderColor: '#6b432f',
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    marginLeft: 8,
    width: 36,
  },
  closeRewardButton: {
    backgroundColor: '#ead4ad',
    borderColor: '#6b432f',
    flex: 1,
  },
  closeRewardText: {
    color: '#7a5947',
    fontFamily: pixelFontFamily,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  closeText: {
    color: '#5c3529',
    fontFamily: pixelFontFamily,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 22,
  },
  confirmButton: {
    backgroundColor: '#b96335',
    borderColor: '#6b321f',
    marginTop: 14,
  },
  coinIcon: {
    height: 22,
    width: 22,
  },
  content: {
    backgroundColor: '#fff8ea',
    paddingBottom: 14,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  eyebrow: {
    color: '#b36b31',
    fontFamily: pixelFontFamily,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  giftImage: {
    height: 92,
    width: 92,
  },
  giftBoxStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 96,
  },
  giftCountBadge: {
    alignItems: 'center',
    backgroundColor: '#b96335',
    borderColor: '#6b321f',
    borderWidth: 2,
    bottom: 1,
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    right: 2,
  },
  giftCountText: {
    color: '#fff8ea',
    fontFamily: pixelFontFamily,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  giftStage: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  header: {
    alignItems: 'flex-start',
    backgroundColor: '#fff8ea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 7,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  innerBorder: {
    backgroundColor: '#fff8ea',
    borderColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  outerBorder: {
    backgroundColor: '#fff8ea',
    borderColor: '#3d2d28',
    borderWidth: 2,
    padding: 0,
    position: 'relative',
    zIndex: 2,
  },
  popupBackdrop: {
    backgroundColor: 'rgba(49, 42, 35, 0.58)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popupFrame: {
    maxHeight: '86%',
    position: 'relative',
  },
  popupLayer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 45,
  },
  rewardAmount: {
    color: '#b65f2f',
    fontFamily: pixelFontFamily,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rewardAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
  },
  rewardCard: {
    backgroundColor: '#fff0cc',
    borderColor: '#9a603d',
    borderWidth: 2,
    flex: 1,
    minHeight: 104,
    minWidth: 0,
    padding: 10,
  },
  rewardDescription: {
    color: '#7a5947',
    fontFamily: pixelFontFamily,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 7,
  },
  countdownRow: {
    alignItems: 'center',
    borderColor: '#c8a070',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  countdownLabel: {
    color: '#9b6234',
    fontFamily: pixelFontFamily,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  countdownValue: {
    color: '#35281f',
    fontFamily: pixelFontFamily,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rewardTitle: {
    color: '#35281f',
    fontFamily: pixelFontFamily,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 19,
  },
  title: {
    color: '#35281f',
    fontFamily: pixelFontFamily,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 23,
  },
});
