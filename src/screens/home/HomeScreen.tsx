import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TodayTasksModal } from '../../features/goals/components/TodayTasksModal';
import { YearlyGoalModal } from '../../features/goals/components/YearlyGoalModal';
import {
  goalSlotExpansionCount,
  initialActiveYearlyGoalLimit,
  maxGoalSlotExpansionPurchases,
  useGoalPlanner,
} from '../../features/goals/hooks/useGoalPlanner';
import { getRemainingTaskBadge } from '../../features/goals/utils';
import { CalendarModal } from '../../features/calendar/components/CalendarModal';
import { useI18n } from '../../features/i18n';
import { InventoryModal } from '../../features/inventory/components/InventoryModal';
import {
  consumeInventoryItem,
  increaseInventoryCapacity,
  loadInventoryCapacity,
  loadInventoryItems,
  resetInventory,
  saveInventoryItem,
} from '../../features/inventory/inventoryRepository';
import {
  initialInventorySlotCount,
  inventoryExpansionSlotCount,
  type InventoryItem,
} from '../../features/inventory/types';
import { getItemImage } from '../../features/items/itemImages';
import { getItemCareEffect, getItemShopCategory } from '../../features/items/itemCatalog';
import { getLocalizedInventoryItem } from '../../features/items/localizedItems';
import {
  loadActivePetId,
  loadPetName,
  loadPetRoomName,
  saveActivePetId,
  savePetName,
  savePetRoomName,
} from '../../features/pets/petProfileRepository';
import {
  DeliveryEventReason,
  drawDeliveryMessage,
} from '../../features/rewards/deliveryMessages';
import { DeliveryReward, drawDeliveryReward } from '../../features/rewards/eventRewards';
import {
  consumeGiftBox,
  increaseGiftBoxCount,
  loadGiftBoxCount,
} from '../../features/rewards/giftBoxRepository';
import { experiencePerGrowthStage, growthStages } from '../../features/rewards/rewardSystem';
import type { CareMeterKey } from '../../features/rewards/rewardSystem';
import { formatCountdown, useHourlyDelivery } from '../../features/rewards/useHourlyDelivery';
import {
  deleteDecorPlacement,
  loadDecorPlacements,
  saveDecorPlacement,
} from '../../features/room/decorPlacementRepository';
import { getDecorPresentation } from '../../features/room/decorPresentation';
import { ShopModal } from '../../features/shop/components/ShopModal';
import type { GoalCapacityShopItem, InventoryCapacityShopItem, ShopItem } from '../../features/shop/items';
import {
  CareItemUsePopup,
  type CareUsableItem,
} from './components/CareItemUsePopup';
import { DeliveryRewardPopup } from './components/DeliveryRewardPopup';
import { EventPopup } from './components/EventPopup';
import { GiftRewardPopup } from './components/GiftRewardPopup';
import {
  PetCareBubbleActions,
  PetStatusHud,
} from './components/PetCareOverlay';
import { HomeActionRail } from './components/HomeActionRail';
import { LocalDevControls } from './components/LocalDevControls';
import { PetRoomPopup } from './components/PetRoomPopup';
import { PetSettingsPopup } from './components/PetSettingsPopup';
import { PetStatusPopup } from './components/PetStatusPopup';
import { RewardDeliveryEvent } from './components/RewardDeliveryEvent';
import { StaticPet } from './components/StaticPet';
import { leftActions, pets, rightActions } from './homeData';
import { clamp, isLocalhostDevWeb } from './homeUtils';
import { GrowthStage, PetDefinition, RailAction, RailMetrics } from './types';

const roomWallpaperImage = require('../../../assets/images/rooms/wallpapers/basic-room-wallpaper.png');
const roomFloorImage = require('../../../assets/images/rooms/flooring/basic-room-floor.png');
const pixelFontFamily = 'Galmuri11';
const localDevCurrencyGrantAmount = 1000;
const localDevExperienceGrantAmount = 10;
const maxInventoryCapacityPurchases = 3;
type InventoryCapacityPurchaseCounts = Record<InventoryCapacityShopItem['id'], number>;

type RoomBackgroundImages = {
  floor: ImageSourcePropType;
  wallpaper: ImageSourcePropType;
};

type PetNameMap = Partial<Record<PetDefinition['id'], string>>;
type PetRoomNameMap = Partial<Record<PetDefinition['id'], string>>;
type PetAnimationActionTrigger = {
  action: 'doze' | 'walk';
  nonce: number;
};

type PlacedDecorItem = {
  item: InventoryItem;
  layerOrder: number;
  x: number;
  y: number;
};

type RoomWindowFrame = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type PendingDecorPlacement = {
  itemId: string;
  x: number;
  y: number;
};

type PagePoint = {
  x: number;
  y: number;
};

function getGrowthStageIndex(stage: GrowthStage) {
  return growthStages.indexOf(stage);
}

function getCareUsableItems(
  items: readonly InventoryItem[],
  meter: CareMeterKey,
): CareUsableItem[] {
  return items.flatMap((item) => {
    const careEffect = getItemCareEffect(item.id);

    return careEffect && careEffect.meter === meter && item.quantity > 0
      ? [{ ...item, careEffect }]
      : [];
  });
}

function constrainDecorCoordinates(x: number, y: number) {
  return {
    x: clamp(x, 0.05, 0.95),
    y: clamp(y, 0.08, 0.94),
  };
}

export function HomeScreen() {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPetRoomOpen, setIsPetRoomOpen] = useState(false);
  const [isPetStatusOpen, setIsPetStatusOpen] = useState(false);
  const [isPetSettingsOpen, setIsPetSettingsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGiftRewardOpen, setIsGiftRewardOpen] = useState(false);
  const [isClaimingGiftReward, setIsClaimingGiftReward] = useState(false);
  const [giftBoxCount, setGiftBoxCount] = useState(0);
  const [giftReward, setGiftReward] = useState<DeliveryReward | null>(null);
  const [giftRewardError, setGiftRewardError] = useState('');
  const [ownedShopItemIds, setOwnedShopItemIds] = useState<string[]>([]);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isLocalDevMenuOpen, setIsLocalDevMenuOpen] = useState(false);
  const [rewardDeliveryEventKey, setRewardDeliveryEventKey] = useState(0);
  const [isRewardParcelAvailable, setIsRewardParcelAvailable] = useState(false);
  const [deliveryReward, setDeliveryReward] = useState<DeliveryReward | null>(null);
  const [deliveryRewardMessage, setDeliveryRewardMessage] = useState('');
  const [deliveryEventReason, setDeliveryEventReason] = useState<DeliveryEventReason>('manual');
  const [isDeliveryRewardPopupOpen, setIsDeliveryRewardPopupOpen] = useState(false);
  const [isClaimingDeliveryReward, setIsClaimingDeliveryReward] = useState(false);
  const [deliveryRewardError, setDeliveryRewardError] = useState('');
  const [activePetId, setActivePetId] = useState<PetDefinition['id']>('hamster');
  const [customPetNames, setCustomPetNames] = useState<PetNameMap>({});
  const [customPetRoomNames, setCustomPetRoomNames] = useState<PetRoomNameMap>({});
  const [inventoryRefreshVersion, setInventoryRefreshVersion] = useState(0);
  const [capacityPurchaseCounts, setCapacityPurchaseCounts] = useState<InventoryCapacityPurchaseCounts>({
    'decor-inventory-expansion': 0,
    'inventory-expansion': 0,
  });
  const [isSavingPetName, setIsSavingPetName] = useState(false);
  const [petStatusError, setPetStatusError] = useState('');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [activeCareMeter, setActiveCareMeter] = useState<CareMeterKey | null>(null);
  const [isPetCareMenuOpen, setIsPetCareMenuOpen] = useState(false);
  const [petHorizontalOffset, setPetHorizontalOffset] = useState(0);
  const [careUsableItems, setCareUsableItems] = useState<CareUsableItem[]>([]);
  const [careItemError, setCareItemError] = useState('');
  const [isUsingCareItem, setIsUsingCareItem] = useState(false);
  const [placementItem, setPlacementItem] = useState<InventoryItem | null>(null);
  const [isRepositioningPlacedItem, setIsRepositioningPlacedItem] = useState(false);
  const [placementError, setPlacementError] = useState('');
  const [placedDecorItems, setPlacedDecorItems] = useState<Record<string, PlacedDecorItem>>({});
  const [selectedDecorItemId, setSelectedDecorItemId] = useState<string | null>(null);
  const [roomLayout, setRoomLayout] = useState({ height: 0, width: 0 });
  const [roomWindowFrame, setRoomWindowFrame] = useState<RoomWindowFrame>({
    height: 0,
    width: 0,
    x: 0,
    y: 0,
  });
  const [roomBackgroundImages, setRoomBackgroundImages] = useState<RoomBackgroundImages>({
    floor: roomFloorImage,
    wallpaper: roomWallpaperImage,
  });
  const [petAnimationActionTrigger, setPetAnimationActionTrigger] =
    useState<PetAnimationActionTrigger | undefined>();
  const { language, setLanguage, t } = useI18n();
  const goalPlanner = useGoalPlanner();
  const {
    abandonYearlyGoal,
    activeYearlyGoalLimit,
    addYearlyGoal,
    careMeters,
    closeTodayTasks,
    closeYearlyGoal,
    dailyPlans,
    fillCareMeter,
    grantCurrencyReward,
    grantExperienceReward,
    generateAdditionalTaskForSelectedGoal,
    generateBasicTasksForSelectedGoal,
    goalError,
    hasUsedTaskRefresh,
    isGeneratingPlan,
    isLoadingGoalData,
    isTodayTasksOpen,
    isYearlyGoalOpen,
    openTodayTasks,
    openYearlyGoal,
    openYearlyGoalFromTodayTasks,
    purchaseGoalSlotExpansion,
    refreshOneIncompleteTaskForSelectedGoal,
    resetPetStatus,
    rewardProgress,
    selectedTaskGoalId,
    setSelectedTaskGoalId,
    setYearlyGoalDifficulty,
    setYearlyGoalDraft,
    spendCurrencyReward,
    toggleTask,
    yearlyGoalDraft,
    yearlyGoalDifficulty,
    yearlyGoals,
    activeYearlyGoals,
    activeDailyPlans,
    toggleYearlyGoalCompletion,
  } = goalPlanner;
  const { height, width } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const scale = clamp(shortestSide / 390, 0.78, 1.08);
  const compactHeight = height < 720;
  const roomScale = clamp(Math.min(width / 390, height / 844), 0.82, 1.12);
  const railMetrics: RailMetrics = {
    buttonWidth: Math.round(58 * scale),
    gap: compactHeight ? 4 : Math.round(10 * scale),
    iconSize: Math.round(42 * scale),
    labelFontSize: compactHeight ? 9 : 10,
  };
  const railTop = compactHeight ? 126 : Math.round(148 * roomScale);
  const sideInset = Math.max(6, Math.round(width * 0.02));
  const activePet = pets.find((pet) => pet.id === activePetId) ?? pets[0];
  const activePetDefaultName = t(`pet.${activePet.id}.name`, undefined, activePet.name);
  const activePetDefaultRoomName = t(`pet.${activePet.id}.room`, undefined, activePet.roomName);
  const activePetDisplayName = customPetNames[activePet.id] ?? activePetDefaultName;
  const activePetRoomName = customPetRoomNames[activePet.id] ?? activePetDefaultRoomName;
  const placementItemDisplayName = placementItem ? getLocalizedInventoryItem(placementItem, t).name : '';
  const currentStage = rewardProgress.stage;
  const previousGrowthStageRef = useRef<GrowthStage | null>(null);
  const activePlacementItemIdRef = useRef<string | null>(null);
  const roomBackgroundRef = useRef<View | null>(null);
  const placementOriginalItemRef = useRef<PlacedDecorItem | null>(null);
  const pendingPlacementRef = useRef<PendingDecorPlacement | null>(null);
  const pendingPagePointRef = useRef<PagePoint | null>(null);
  const characterSize = Math.round(132 * roomScale);
  const characterBottom = Math.max(100, Math.round(height * (compactHeight ? 0.15 : 0.18)));
  const cushionPlacement = placedDecorItems['pet-cushion'];
  const cushionPresentation = getDecorPresentation('pet-cushion');
  const cushionDozeZone = useMemo(
    () => cushionPlacement && cushionPlacement.y >= 0.72
      ? {
        centerX: (cushionPlacement.x - 0.5) * roomLayout.width,
        radius: Math.max(
          8,
          Math.round(
            (cushionPresentation.width * roomScale - characterSize * 0.78) / 2,
          ),
        ),
      }
      : undefined,
    [characterSize, cushionPlacement, cushionPresentation.width, roomLayout.width, roomScale],
  );
  const showLocalDevButton = isLocalhostDevWeb();
  const openGiftRewardPopup = () => {
    setGiftReward(null);
    setGiftRewardError('');
    setIsGiftRewardOpen(true);
  };
  const sendGiftReward = async () => {
    try {
      const nextGiftBoxCount = await increaseGiftBoxCount();
      setGiftBoxCount(nextGiftBoxCount);
      markDelivered();
      openGiftRewardPopup();
    } catch {
      setGiftRewardError(t('home.error.giftSend'));
      setIsGiftRewardOpen(true);
    }
  };
  const refreshCapacityPurchaseCounts = useCallback(async () => {
    const [generalCapacity, decorCapacity] = await Promise.all([
      loadInventoryCapacity('general'),
      loadInventoryCapacity('decor'),
    ]);

    setCapacityPurchaseCounts({
      'decor-inventory-expansion': getCapacityPurchaseCount(decorCapacity),
      'inventory-expansion': getCapacityPurchaseCount(generalCapacity),
    });
  }, []);
  const rightRailActions: RailAction[] = [
    ...rightActions.map((action) => {
      const translatedAction = { ...action, label: t(`home.action.${action.id}`, undefined, action.label) };

      if (action.id === 'gift') {
        return {
          ...translatedAction,
          badge: giftBoxCount > 0 ? String(giftBoxCount) : undefined,
          onPress: openGiftRewardPopup,
        };
      }

      if (action.id === 'inventory') {
        return { ...translatedAction, onPress: () => setIsInventoryOpen(true) };
      }

      return translatedAction;
    }),
    {
      id: 'petRoom',
      image: require('../../../assets/images/icons/navigation/pet-room-button-simple.png'),
      label: t('home.action.petRoom'),
      onPress: () => setIsPetRoomOpen(true),
      symbol: 'R',
    },
    {
      id: 'event',
      image: require('../../../assets/images/icons/navigation/event-button.png'),
      label: t('home.action.event'),
      onPress: () => setIsEventOpen(true),
      symbol: 'E',
    },
  ];
  const popupWidth = Math.min(width - 32, 360);
  const petStatusPopupWidth = Math.min(width - 32, 420);
  const leftRailActions: RailAction[] = leftActions.map((action) => {
    const translatedAction = { ...action, label: t(`home.action.${action.id}`, undefined, action.label) };

    if (action.id === 'todayTasks') {
      return {
        ...translatedAction,
        badge: getRemainingTaskBadge(activeDailyPlans),
        onPress: openTodayTasks,
      };
    }

    if (action.id === 'yearlyGoal') {
      return {
        ...translatedAction,
        onPress: openYearlyGoal,
      };
    }

    if (action.id === 'calendar') {
      return { ...translatedAction, onPress: () => setIsCalendarOpen(true) };
    }

    if (action.id === 'shop') {
      return {
        ...translatedAction,
        onPress: () => {
          setIsShopOpen(true);
          void Promise.all([
            loadInventoryItems().then((items) => setOwnedShopItemIds(items.map((item) => item.id))),
            refreshCapacityPurchaseCounts(),
          ]);
        },
      };
    }

    return translatedAction;
  });
  const startRewardDelivery = useCallback((reason: DeliveryEventReason = 'manual') => {
    setDeliveryReward(null);
    setDeliveryRewardMessage('');
    setDeliveryEventReason(reason);
    setDeliveryRewardError('');
    setIsDeliveryRewardPopupOpen(false);
    setIsRewardParcelAvailable(true);
    setRewardDeliveryEventKey((current) => current + 1);
  }, []);
  const { secondsUntilNext, markDelivered } = useHourlyDelivery(
    useCallback(() => void sendGiftReward(), []),
  );
  const refreshRoomBackgroundImages = useCallback(() => {
    void Promise.all([loadInventoryItems(), loadDecorPlacements()]).then(([items, placements]) => {
      const equippedWallpaper = items.find(
        (item) => item.equipped && getItemShopCategory(item.id) === 'wallpaper',
      );
      const equippedFlooring = items.find(
        (item) => item.equipped && getItemShopCategory(item.id) === 'flooring',
      );

      setRoomBackgroundImages({
        floor: equippedFlooring ? getItemImage(equippedFlooring.id) ?? roomFloorImage : roomFloorImage,
        wallpaper: equippedWallpaper
          ? getItemImage(equippedWallpaper.id) ?? roomWallpaperImage
          : roomWallpaperImage,
      });
      const normalizedPlacements = placements
        .sort((a, b) => a.layerOrder - b.layerOrder)
        .map((placement, layerOrder) => ({ ...placement, layerOrder }));

      setPlacedDecorItems(Object.fromEntries(
        normalizedPlacements
          .map((placement) => {
            const item = items.find((candidate) => candidate.id === placement.itemId);
            const coordinates = constrainDecorCoordinates(placement.x, placement.y);

            return item ? [item.id, { item, layerOrder: placement.layerOrder, ...coordinates }] : null;
          })
          .filter((entry): entry is [string, PlacedDecorItem] => entry !== null),
      ));
      const changedLayerPlacements = normalizedPlacements.filter(
        (placement, index) => placement.layerOrder !== placements[index]?.layerOrder,
      );
      if (changedLayerPlacements.length > 0) {
        void Promise.all(changedLayerPlacements.map(saveDecorPlacement));
      }
    });
  }, []);
  useEffect(() => {
    refreshRoomBackgroundImages();
  }, [refreshRoomBackgroundImages]);

  useEffect(() => {
    void refreshCapacityPurchaseCounts();
  }, [refreshCapacityPurchaseCounts]);

  useEffect(() => {
    void loadGiftBoxCount().then(setGiftBoxCount).catch(() => {
      setGiftRewardError(t('home.error.giftLoad'));
    });
  }, [t]);

  useEffect(() => {
    void Promise.all(
      pets.map(async (pet) => {
        const [petName, roomName] = await Promise.all([
          loadPetName(pet.id),
          loadPetRoomName(pet.id),
        ]);

        return [pet.id, petName, roomName] as const;
      }),
    ).then((entries) => {
      setCustomPetNames(Object.fromEntries(
        entries
          .filter((entry): entry is readonly [PetDefinition['id'], string, string | null] => Boolean(entry[1]))
          .map(([petId, petName]) => [petId, petName]),
      ) as PetNameMap);
      setCustomPetRoomNames(Object.fromEntries(
        entries
          .filter((entry): entry is readonly [PetDefinition['id'], string | null, string] => Boolean(entry[2]))
          .map(([petId, , roomName]) => [petId, roomName]),
      ) as PetRoomNameMap);
    }).catch(() => {
      setPetStatusError(t('home.error.profileLoad'));
    });
  }, [t]);

  useEffect(() => {
    void loadActivePetId().then((petId) => {
      if (petId && pets.some((pet) => pet.id === petId)) {
        setActivePetId(petId as PetDefinition['id']);
      }
    }).catch(() => {
      setPetStatusError(t('home.error.profileLoad'));
    });
  }, [t]);

  useEffect(() => {
    if (isLoadingGoalData) {
      return;
    }

    const previousStage = previousGrowthStageRef.current;

    if (previousStage === null) {
      previousGrowthStageRef.current = currentStage;
      return;
    }

    previousGrowthStageRef.current = currentStage;

    if (getGrowthStageIndex(currentStage) > getGrowthStageIndex(previousStage)) {
      startRewardDelivery('growth');
    }
  }, [currentStage, isLoadingGoalData, startRewardDelivery]);
  const handleLocalDevAction = (label: string) => {
    if (label === 'event:parcel') {
      startRewardDelivery();
      return;
    }

    if (label === 'event:gift') {
      void sendGiftReward();
      return;
    }

    if (label === 'action:walk') {
      setPetAnimationActionTrigger((current) => ({
        action: 'walk',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      return;
    }

    if (label === 'action:doze') {
      setPetAnimationActionTrigger((current) => ({
        action: 'doze',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      return;
    }

    if (label === 'data:currency') {
      grantCurrencyReward(localDevCurrencyGrantAmount);
      return;
    }

    if (label === 'data:growth') {
      grantExperienceReward(localDevExperienceGrantAmount);
      return;
    }

    if (label === 'data:growthFull') {
      grantExperienceReward(experiencePerGrowthStage);
      return;
    }

    if (label === 'reset') {
      resetPetStatus();
      void resetInventory().then(() => {
        setCapacityPurchaseCounts({
          'decor-inventory-expansion': 0,
          'inventory-expansion': 0,
        });
        setInventoryRefreshVersion((version) => version + 1);
        void refreshRoomBackgroundImages();
      });
    }
  };
  const closeDeliveryReward = () => {
    if (isClaimingDeliveryReward) return;
    setIsDeliveryRewardPopupOpen(false);
  };
  const discardDeliveryReward = () => {
    if (isClaimingDeliveryReward) return;
    setDeliveryReward(null);
    setDeliveryRewardMessage('');
    setDeliveryRewardError('');
    setIsDeliveryRewardPopupOpen(false);
    setIsRewardParcelAvailable(false);
  };
  const openDeliveryReward = () => {
    setDeliveryReward((current) => current ?? drawDeliveryReward());
    setDeliveryRewardMessage((current) => current || drawDeliveryMessage(deliveryEventReason, t));
    setDeliveryRewardError('');
    setIsDeliveryRewardPopupOpen(true);
  };
  const acceptDeliveryReward = async () => {
    if (!deliveryReward || isClaimingDeliveryReward) return;

    setIsClaimingDeliveryReward(true);
    setDeliveryRewardError('');

    try {
      if (deliveryReward.kind === 'currency') {
        grantCurrencyReward(deliveryReward.amount);
      } else {
        await saveInventoryItem(deliveryReward.item);
        setInventoryRefreshVersion((version) => version + 1);
      }

      setDeliveryReward(null);
      setDeliveryRewardMessage('');
      setIsDeliveryRewardPopupOpen(false);
      setIsRewardParcelAvailable(false);
    } catch {
      setDeliveryRewardError(t('home.error.deliverySave'));
    } finally {
      setIsClaimingDeliveryReward(false);
    }
  };
  const closeGiftReward = () => {
    if (isClaimingGiftReward) return;

    setGiftReward(null);
    setGiftRewardError('');
    setIsGiftRewardOpen(false);
  };
  const openGiftBox = async () => {
    if (giftBoxCount <= 0 || isClaimingGiftReward) return;

    let didConsumeGiftBox = false;
    setIsClaimingGiftReward(true);
    setGiftRewardError('');

    try {
      const nextGiftBoxCount = await consumeGiftBox();

      if (nextGiftBoxCount === null) {
        setGiftBoxCount(0);
        setGiftRewardError(t('home.error.giftMissing'));
        return;
      }

      didConsumeGiftBox = true;
      setGiftBoxCount(nextGiftBoxCount);

      const reward = drawDeliveryReward();

      if (reward.kind === 'currency') {
        grantCurrencyReward(reward.amount);
      } else {
        await saveInventoryItem(reward.item);
      }

      setGiftReward(reward);
    } catch {
      if (didConsumeGiftBox) {
        try {
          const restoredGiftBoxCount = await increaseGiftBoxCount();
          setGiftBoxCount(restoredGiftBoxCount);
        } catch {
          // Keep the visible error below when the rollback persistence also fails.
        }
      }

      setGiftRewardError(t('home.error.giftOpen'));
    } finally {
      setIsClaimingGiftReward(false);
    }
  };
  const closePetStatus = () => {
    if (isSavingPetName) return;

    setPetStatusError('');
    setIsPetSettingsOpen(false);
    setIsPetStatusOpen(false);
  };
  const updateActivePetProfile = async (name: string, roomName: string) => {
    const normalizedName = name.trim();
    const normalizedRoomName = roomName.trim();

    if (!normalizedName) {
      setPetStatusError(t('home.error.nameRequired'));
      return;
    }

    if (!normalizedRoomName) {
      setPetStatusError(t('home.error.roomNameRequired'));
      return;
    }

    setIsSavingPetName(true);
    setPetStatusError('');

    try {
      const [savedName, savedRoomName] = await Promise.all([
        savePetName(activePet.id, normalizedName),
        savePetRoomName(activePet.id, normalizedRoomName),
      ]);

      setCustomPetNames((current) => ({ ...current, [activePet.id]: savedName }));
      setCustomPetRoomNames((current) => ({ ...current, [activePet.id]: savedRoomName }));
      setIsPetStatusOpen(false);
    } catch {
      setPetStatusError(t('home.error.profileSave'));
    } finally {
      setIsSavingPetName(false);
    }
  };
  const openCareItemPopup = async (meter: CareMeterKey) => {
    setActiveCareMeter(meter);
    setCareItemError('');

    try {
      const items = await loadInventoryItems();
      setCareUsableItems(getCareUsableItems(items, meter));
    } catch {
      setCareUsableItems([]);
      setCareItemError(t('home.error.careLoad'));
    }
  };
  const selectPetCareAction = (meter: CareMeterKey) => {
    void openCareItemPopup(meter);
  };
  const closeCareItemPopup = () => {
    if (isUsingCareItem) return;

    setActiveCareMeter(null);
    setCareUsableItems([]);
    setCareItemError('');
  };
  const useCareItem = async (item: CareUsableItem, quantity: number) => {
    if (isUsingCareItem) return;

    setIsUsingCareItem(true);
    setCareItemError('');

    try {
      const consumed = await consumeInventoryItem(item.id, quantity);

      if (!consumed) {
        setCareItemError(t('home.error.careQuantity'));
        return;
      }

      fillCareMeter(item.careEffect.meter, item.careEffect.increase * quantity);
      setActiveCareMeter(null);
      setCareUsableItems([]);
    } catch {
      setCareItemError(t('home.error.careUse'));
    } finally {
      setIsUsingCareItem(false);
    }
  };
  const purchaseShopItem = async (item: ShopItem): Promise<boolean> => {
    const itemPrice = getShopItemPrice(item, capacityPurchaseCounts, activeYearlyGoalLimit);
    if (rewardProgress.coins < itemPrice) return false;

    try {
      if (item.kind === 'inventory-capacity') {
        const currentCapacity = await loadInventoryCapacity(item.capacityCategory);
        const purchaseCount = getCapacityPurchaseCount(currentCapacity);

        if (purchaseCount >= maxInventoryCapacityPurchases) return false;

        const nextPrice = getInventoryCapacityPrice(item, purchaseCount);
        const purchased = spendCurrencyReward(nextPrice);

        if (!purchased) return false;

        await increaseInventoryCapacity(item.capacityCategory, item.slotIncrease);
        await refreshCapacityPurchaseCounts();
        setInventoryRefreshVersion((version) => version + 1);
        return true;
      }

      if (item.kind === 'goal-capacity') {
        const purchaseCount = getGoalSlotExpansionPurchaseCount(activeYearlyGoalLimit);

        if (purchaseCount >= maxGoalSlotExpansionPurchases) return false;

        const nextPrice = getGoalCapacityPrice(item, purchaseCount);
        const purchased = purchaseGoalSlotExpansion(nextPrice, item.slotIncrease);

        if (!purchased) return false;

        return true;
      }

      await saveInventoryItem({
        category: item.inventoryCategory,
        description: item.description,
        equipped: false,
        id: item.id,
        isNew: true,
        name: item.name,
        quantity: 1,
        symbol: item.symbol,
      });
      const purchased = spendCurrencyReward(item.price);

      if (!purchased) return false;

      setOwnedShopItemIds((current) => current.includes(item.id) ? current : [...current, item.id]);
      setInventoryRefreshVersion((version) => version + 1);
      return true;
    } catch {
      return false;
    }
  };
  const getDisplayedShopItemPrice = useCallback(
    (item: ShopItem) => getShopItemPrice(item, capacityPurchaseCounts, activeYearlyGoalLimit),
    [activeYearlyGoalLimit, capacityPurchaseCounts],
  );
  const isShopItemSoldOut = useCallback(
    (item: ShopItem) =>
      (item.kind === 'inventory-capacity'
        && (capacityPurchaseCounts[item.id] ?? 0) >= maxInventoryCapacityPurchases)
      || (item.kind === 'goal-capacity'
        && getGoalSlotExpansionPurchaseCount(activeYearlyGoalLimit) >= maxGoalSlotExpansionPurchases),
    [activeYearlyGoalLimit, capacityPurchaseCounts],
  );
  const beginDecorPlacement = (item: InventoryItem) => {
    const existingPlacement = placedDecorItems[item.id];
    const presentation = getDecorPresentation(item.id);
    const normalizedExistingPlacement = existingPlacement
      ? { ...existingPlacement, ...constrainDecorCoordinates(existingPlacement.x, existingPlacement.y) }
      : null;

    setPlacementError('');
    setSelectedDecorItemId(null);
    setIsRepositioningPlacedItem(false);
    activePlacementItemIdRef.current = item.id;
    placementOriginalItemRef.current = normalizedExistingPlacement;
    updateDecorPlacementPreview(
      item,
      normalizedExistingPlacement?.x ?? presentation.initialX,
      normalizedExistingPlacement?.y ?? presentation.initialY,
    );
    setPlacementItem(item);
    setIsInventoryOpen(false);
  };
  const beginPlacedDecorEdit = (item: InventoryItem) => {
    const existingPlacement = placedDecorItems[item.id];
    const normalizedExistingPlacement = existingPlacement
      ? { ...existingPlacement, ...constrainDecorCoordinates(existingPlacement.x, existingPlacement.y) }
      : null;

    setPlacementError('');
    setSelectedDecorItemId(null);
    activePlacementItemIdRef.current = item.id;
    placementOriginalItemRef.current = normalizedExistingPlacement;
    setIsRepositioningPlacedItem(true);
    setPlacementItem(item);
  };
  const measureRoomWindowFrame = useCallback(() => {
    roomBackgroundRef.current?.measureInWindow((x, y, frameWidth, frameHeight) => {
      setRoomWindowFrame({ height: frameHeight, width: frameWidth, x, y });
    });
  }, []);
  const updateRoomLayout = (event: LayoutChangeEvent) => {
    const { height: roomHeight, width: roomWidth } = event.nativeEvent.layout;

    setRoomLayout({ height: roomHeight, width: roomWidth });
    requestAnimationFrame(measureRoomWindowFrame);
  };
  useEffect(() => {
    requestAnimationFrame(measureRoomWindowFrame);
  }, [height, measureRoomWindowFrame, width]);
  const getPlacementCoordinates = (event: GestureResponderEvent, item: InventoryItem) => {
    const { locationX, locationY } = event.nativeEvent;

    return constrainDecorCoordinates(
      locationX / Math.max(roomLayout.width || width, 1),
      locationY / Math.max(roomLayout.height || height, 1),
    );
  };
  const getUnconstrainedPlacementCoordinatesFromPage = (pageX: number, pageY: number) => {
    const frameWidth = roomWindowFrame.width || roomLayout.width || width;
    const frameHeight = roomWindowFrame.height || roomLayout.height || height;

    return {
      x: (pageX - roomWindowFrame.x) / Math.max(frameWidth, 1),
      y: (pageY - roomWindowFrame.y) / Math.max(frameHeight, 1),
    };
  };
  const isPointInReturnToBagZone = (pageX: number, pageY: number) => {
    const frameWidth = roomWindowFrame.width || roomLayout.width || width;
    const frameHeight = roomWindowFrame.height || roomLayout.height || height;
    const localX = pageX - roomWindowFrame.x;
    const localY = pageY - roomWindowFrame.y;

    return localX >= frameWidth - 126 && localY >= frameHeight - 136;
  };
  const updateDecorPlacementPreview = (
    item: InventoryItem,
    x: number,
    y: number,
    shouldConstrain = true,
  ) => {
    const coordinates = shouldConstrain ? constrainDecorCoordinates(x, y) : { x, y };
    pendingPlacementRef.current = { itemId: item.id, ...coordinates };
    setPlacedDecorItems((current) => {
      const layerOrder = current[item.id]?.layerOrder
        ?? Object.values(current).reduce((highest, placedItem) => (
          Math.max(highest, placedItem.layerOrder)
        ), -1) + 1;

      return {
        ...current,
        [item.id]: { item, layerOrder, ...coordinates },
      };
    });
  };
  const saveDecorPlacementAndClose = (item: InventoryItem, x: number, y: number) => {
    const requestedPlacement = pendingPlacementRef.current?.itemId === item.id
      ? pendingPlacementRef.current
      : { itemId: item.id, x, y };
    const coordinates = constrainDecorCoordinates(requestedPlacement.x, requestedPlacement.y);
    const pendingPlacement = { itemId: item.id, ...coordinates };
    const layerOrder = placedDecorItems[item.id]?.layerOrder
      ?? Object.values(placedDecorItems).reduce((highest, placedItem) => (
        Math.max(highest, placedItem.layerOrder)
      ), -1) + 1;
    updateDecorPlacementPreview(item, pendingPlacement.x, pendingPlacement.y);
    void saveDecorPlacement({
      itemId: item.id,
      layerOrder,
      x: pendingPlacement.x,
      y: pendingPlacement.y,
    }).catch(() => {
      setPlacementError(t('home.error.decorSave'));
      void refreshRoomBackgroundImages();
    }).finally(() => {
      pendingPlacementRef.current = null;
      pendingPagePointRef.current = null;
    });
    activePlacementItemIdRef.current = null;
    placementOriginalItemRef.current = null;
    setIsRepositioningPlacedItem(false);
    setPlacementItem(null);
  };
  const removePlacedDecorItem = (itemId: string) => {
    setPlacedDecorItems((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    pendingPlacementRef.current = null;
    pendingPagePointRef.current = null;
    activePlacementItemIdRef.current = null;
    placementOriginalItemRef.current = null;
    setIsRepositioningPlacedItem(false);
    setPlacementItem(null);
    setPlacementError('');
    setSelectedDecorItemId((current) => current === itemId ? null : current);
    void deleteDecorPlacement(itemId).catch(() => {
      setPlacementError(t('home.error.decorReturn'));
      void refreshRoomBackgroundImages();
    });
  };
  const changeDecorLayerOrder = (itemId: string, direction: 'backward' | 'forward') => {
    const orderedItems = Object.values(placedDecorItems)
      .sort((a, b) => a.layerOrder - b.layerOrder);
    const currentItem = placedDecorItems[itemId];

    if (!currentItem) return;

    const currentPresentation = getDecorPresentation(currentItem.item.id);
    const currentWidth = currentPresentation.width * roomScale;
    const currentHeight = currentPresentation.height * roomScale;
    const currentCenterX = currentItem.x * roomLayout.width;
    const currentCenterY = currentItem.y * roomLayout.height;
    const overlappingItems = orderedItems.filter((candidate) => {
      if (candidate.item.id === itemId || candidate.item.id === 'pet-rug') return false;

      const candidatePresentation = getDecorPresentation(candidate.item.id);
      const candidateWidth = candidatePresentation.width * roomScale;
      const candidateHeight = candidatePresentation.height * roomScale;
      const candidateCenterX = candidate.x * roomLayout.width;
      const candidateCenterY = candidate.y * roomLayout.height;

      return Math.abs(currentCenterX - candidateCenterX) < (currentWidth + candidateWidth) / 2
        && Math.abs(currentCenterY - candidateCenterY) < (currentHeight + candidateHeight) / 2;
    });
    const targetItem = direction === 'forward'
      ? overlappingItems.find((candidate) => candidate.layerOrder > currentItem.layerOrder)
      : overlappingItems
        .slice()
        .reverse()
        .find((candidate) => candidate.layerOrder < currentItem.layerOrder);

    if (!targetItem) return;

    const nextCurrentItem = { ...currentItem, layerOrder: targetItem.layerOrder };
    const nextTargetItem = { ...targetItem, layerOrder: currentItem.layerOrder };

    setPlacedDecorItems((current) => ({
      ...current,
      [currentItem.item.id]: nextCurrentItem,
      [targetItem.item.id]: nextTargetItem,
    }));
    void Promise.all([
      saveDecorPlacement({
        itemId: nextCurrentItem.item.id,
        layerOrder: nextCurrentItem.layerOrder,
        x: nextCurrentItem.x,
        y: nextCurrentItem.y,
      }),
      saveDecorPlacement({
        itemId: nextTargetItem.item.id,
        layerOrder: nextTargetItem.layerOrder,
        x: nextTargetItem.x,
        y: nextTargetItem.y,
      }),
    ]).catch(() => {
      setPlacementError(t('home.error.decorSave'));
      void refreshRoomBackgroundImages();
    });
  };
  const placeDecorItem = (event: GestureResponderEvent) => {
    if (!placementItem) return;

    const { x, y } = getPlacementCoordinates(event, placementItem);
    saveDecorPlacementAndClose(placementItem, x, y);
  };
  const movePlacedDecorFromPagePoint = (item: InventoryItem, pageX: number, pageY: number) => {
    pendingPagePointRef.current = { x: pageX, y: pageY };
    const { x, y } = getUnconstrainedPlacementCoordinatesFromPage(pageX, pageY);
    updateDecorPlacementPreview(item, x, y, false);
  };
  const finishDecorPlacementAtPagePoint = (item: InventoryItem, pageX: number, pageY: number) => {
    if (activePlacementItemIdRef.current !== item.id) return;

    if (isPointInReturnToBagZone(pageX, pageY)) {
      removePlacedDecorItem(item.id);
      return;
    }

    const { x, y } = getUnconstrainedPlacementCoordinatesFromPage(pageX, pageY);
    saveDecorPlacementAndClose(item, x, y);
  };
  const finishPlacedDecorDrag = (item: InventoryItem, pageX: number, pageY: number, didMove: boolean) => {
    if (!didMove) {
      beginPlacedDecorEdit(item);
      return;
    }

    finishDecorPlacementAtPagePoint(item, pageX, pageY);
  };
  const placementDragResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => placementItem !== null,
    onPanResponderMove: (event) => {
      if (!placementItem) return;

      pendingPagePointRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      const { x, y } = getUnconstrainedPlacementCoordinatesFromPage(
        event.nativeEvent.pageX,
        event.nativeEvent.pageY,
      );
      updateDecorPlacementPreview(placementItem, x, y, false);
    },
    onPanResponderRelease: (event) => {
      if (!placementItem) return;

      finishDecorPlacementAtPagePoint(
        placementItem,
        event.nativeEvent.pageX,
        event.nativeEvent.pageY,
      );
    },
    onPanResponderTerminate: (event) => {
      if (!placementItem) return;

      finishDecorPlacementAtPagePoint(
        placementItem,
        event.nativeEvent.pageX,
        event.nativeEvent.pageY,
      );
    },
    onStartShouldSetPanResponder: () => false,
  }), [height, placementItem, roomLayout.height, roomLayout.width, width]);
  const returnPlacedDecorToBag = (event: GestureResponderEvent) => {
    if (!placementItem) return;

    event.stopPropagation();
    removePlacedDecorItem(placementItem.id);
  };
  useEffect(() => {
    if (!placementItem || typeof window === 'undefined') return undefined;

    const finishPlacement = () => {
      const item = placementItem;
      const pendingPoint = pendingPagePointRef.current;

      if (pendingPoint) finishDecorPlacementAtPagePoint(item, pendingPoint.x, pendingPoint.y);
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];

      if (touch) {
        pendingPagePointRef.current = { x: touch.pageX, y: touch.pageY };
      }
      finishPlacement();
    };
    const handleMouseUp = (event: MouseEvent) => {
      pendingPagePointRef.current = { x: event.pageX, y: event.pageY };
      finishPlacement();
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [finishDecorPlacementAtPagePoint, placementItem]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.room}>
          <View
            accessibilityIgnoresInvertColors
            onLayout={updateRoomLayout}
            ref={roomBackgroundRef}
            style={styles.roomBackground}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="stretch"
              source={roomBackgroundImages.wallpaper}
              style={styles.roomWallpaperImage}
            />
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="stretch"
              source={roomBackgroundImages.floor}
              style={styles.roomFloorImage}
            />
            {Object.values(placedDecorItems)
              .sort((a, b) => a.layerOrder - b.layerOrder)
              .map((placedItem) => (
              <PlacedDecorObject
                item={placedItem.item}
                key={placedItem.item.id}
                onDragEnd={finishPlacedDecorDrag}
                onDragMove={movePlacedDecorFromPagePoint}
                onLongPress={beginPlacedDecorEdit}
                onPress={(item) => setSelectedDecorItemId((current) => (
                  current === item.id ? null : item.id
                ))}
                petBaselineY={roomLayout.height - characterBottom}
                layerOrder={placedItem.layerOrder}
                roomHeight={roomLayout.height}
                roomScale={roomScale}
                x={placedItem.x}
                y={placedItem.y}
              />
              ))}
            {selectedDecorItemId && placedDecorItems[selectedDecorItemId] ? (
              <DecorActionMenu
                onBringForward={() => changeDecorLayerOrder(selectedDecorItemId, 'forward')}
                onSendBackward={() => changeDecorLayerOrder(selectedDecorItemId, 'backward')}
                placedItem={placedDecorItems[selectedDecorItemId]}
                roomHeight={roomLayout.height}
                roomWidth={roomLayout.width}
                roomScale={roomScale}
              />
            ) : null}
            <View pointerEvents="box-none" style={[styles.characterStage, { bottom: characterBottom }]}>
              <PetCareBubbleActions
                horizontalOffset={clamp(
                  petHorizontalOffset,
                  -Math.max(0, roomLayout.width / 2 - 100),
                  Math.max(0, roomLayout.width / 2 - 100),
                )}
                onCareAction={selectPetCareAction}
                visible={isPetCareMenuOpen}
              />
              <StaticPet
                animationActionTrigger={petAnimationActionTrigger}
                dozeZone={cushionDozeZone}
                movementPaused={isPetCareMenuOpen}
                onHorizontalOffsetChange={setPetHorizontalOffset}
                onPress={() => setIsPetCareMenuOpen((current) => !current)}
                pet={activePet}
                petName={activePetDisplayName}
                stage={currentStage}
                size={characterSize}
              />
            </View>
            {placementItem ? (
              <View style={styles.placementLayer}>
                <Pressable
                  {...placementDragResponder.panHandlers}
                  accessibilityLabel={t('home.placementA11y', { name: placementItemDisplayName })}
                  accessibilityRole="button"
                  onPress={placeDecorItem}
                  style={styles.placementHitArea}
                />
                <View style={styles.placementToolbar}>
                  <Text style={styles.placementText}>
                    {isRepositioningPlacedItem
                      ? t('home.placementMoveText', { name: placementItemDisplayName })
                      : t('home.placementText', { name: placementItemDisplayName })}
                  </Text>
                </View>
                {isRepositioningPlacedItem ? (
                  <Pressable
                    accessibilityLabel={t('home.returnToBagA11y', { name: placementItemDisplayName })}
                    accessibilityRole="button"
                    onPress={returnPlacedDecorToBag}
                    style={({ pressed }) => [styles.returnToBagTarget, pressed && styles.returnToBagTargetPressed]}
                  >
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={require('../../../assets/images/icons/navigation/return-to-bag-icon.png')}
                      style={styles.returnToBagIcon}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <PetStatusHud
          careMeters={careMeters}
          onPressPet={() => setIsPetStatusOpen(true)}
          petImage={activePet.profileStages?.[currentStage] ?? activePet.stages[currentStage]}
          petName={activePetDisplayName}
          progress={rewardProgress}
          roomName={activePetRoomName}
        />

        <CareItemUsePopup
          errorMessage={careItemError}
          isBusy={isUsingCareItem}
          items={careUsableItems}
          meter={activeCareMeter}
          onClose={closeCareItemPopup}
          onUseItem={(item, quantity) => void useCareItem(item, quantity)}
          visible={activeCareMeter !== null}
          width={popupWidth}
        />

        {showLocalDevButton ? (
          <LocalDevControls
            isOpen={isLocalDevMenuOpen}
            onAction={handleLocalDevAction}
            onToggle={() => setIsLocalDevMenuOpen((current) => !current)}
          />
        ) : null}

        <RewardDeliveryEvent
          bottom={characterBottom}
          eventKey={rewardDeliveryEventKey}
          height={height}
          isParcelAvailable={isRewardParcelAvailable}
          onOpenParcel={openDeliveryReward}
          width={width}
        />

        <HomeActionRail
          actions={leftRailActions}
          metrics={railMetrics}
          style={{ gap: railMetrics.gap, left: sideInset, top: railTop }}
        />

        <HomeActionRail
          actions={rightRailActions}
          metrics={railMetrics}
          style={{ gap: railMetrics.gap, right: sideInset, top: railTop }}
        />

        {isPetRoomOpen ? (
          <PetRoomPopup
            activePetId={activePetId}
            currentStage={currentStage}
            onClose={() => setIsPetRoomOpen(false)}
            petDisplayNames={customPetNames}
            petRoomNames={customPetRoomNames}
            onSelectPet={(petId) => {
              setActivePetId(petId);
              void saveActivePetId(petId).catch(() => {
                setPetStatusError(t('home.error.profileSave'));
              });
              setIsPetRoomOpen(false);
            }}
            pets={pets}
            scale={scale}
            width={popupWidth}
          />
        ) : null}

        <PetStatusPopup
          careMeters={careMeters}
          defaultName={activePetDefaultName}
          defaultRoomName={activePetDefaultRoomName}
          displayName={activePetDisplayName}
          displayRoomName={activePetRoomName}
          errorMessage={petStatusError}
          isSaving={isSavingPetName}
          onClose={closePetStatus}
          onOpenSettings={() => setIsPetSettingsOpen(true)}
          onSaveProfile={updateActivePetProfile}
          petImage={activePet.stages[currentStage]}
          progress={rewardProgress}
          visible={isPetStatusOpen}
          width={petStatusPopupWidth}
        />

        <PetSettingsPopup
          language={language}
          onChangeLanguage={setLanguage}
          onClose={() => setIsPetSettingsOpen(false)}
          onTogglePushNotifications={() => setPushNotificationsEnabled((current) => !current)}
          pushNotificationsEnabled={pushNotificationsEnabled}
          visible={isPetSettingsOpen}
          width={popupWidth}
        />

        <InventoryModal
          onBeginDecorPlacement={beginDecorPlacement}
          onInventoryChanged={refreshRoomBackgroundImages}
          onClose={() => setIsInventoryOpen(false)}
          key={inventoryRefreshVersion}
          refreshVersion={inventoryRefreshVersion}
          visible={isInventoryOpen}
          width={popupWidth}
        />

        <ShopModal
          coinBalance={rewardProgress.coins}
          getItemPrice={getDisplayedShopItemPrice}
          isItemSoldOut={isShopItemSoldOut}
          onClose={() => setIsShopOpen(false)}
          onPurchase={purchaseShopItem}
          ownedItemIds={ownedShopItemIds}
          visible={isShopOpen}
        />
        <GiftRewardPopup
          giftBoxCount={giftBoxCount}
          isBusy={isClaimingGiftReward}
          onClose={closeGiftReward}
          onOpenBox={openGiftBox}
          reward={giftReward}
          secondsUntilNext={secondsUntilNext}
          visible={isGiftRewardOpen}
          width={popupWidth}
        />
        {giftRewardError ? (
          <View style={styles.deliveryRewardError}>
            <Text style={styles.deliveryRewardErrorText}>{giftRewardError}</Text>
          </View>
        ) : null}

        <EventPopup
          onClose={() => setIsEventOpen(false)}
          visible={isEventOpen}
          width={popupWidth}
        />

        {isCalendarOpen ? <CalendarModal
          onClose={() => setIsCalendarOpen(false)}
          plans={dailyPlans}
          yearlyGoals={yearlyGoals}
          onToggleTask={toggleTask}
          isLoading={goalPlanner.isLoadingGoalData}
          isBusy={isGeneratingPlan}
          errorMessage={goalError}
        /> : null}
        <DeliveryRewardPopup
          isBusy={isClaimingDeliveryReward}
          onAccept={acceptDeliveryReward}
          onClose={closeDeliveryReward}
          onDiscard={discardDeliveryReward}
          message={deliveryRewardMessage}
          reward={deliveryReward}
          visible={isDeliveryRewardPopupOpen}
          width={popupWidth}
        />
        {deliveryRewardError ? (
          <View style={styles.deliveryRewardError}>
            <Text style={styles.deliveryRewardErrorText}>{deliveryRewardError}</Text>
          </View>
        ) : null}
        {placementError ? (
          <View style={styles.deliveryRewardError}>
            <Text style={styles.deliveryRewardErrorText}>{placementError}</Text>
          </View>
        ) : null}
        <YearlyGoalModal
          difficulty={yearlyGoalDifficulty}
          errorMessage={goalError}
          isGenerating={isGeneratingPlan || isLoadingGoalData}
          maxActiveGoals={activeYearlyGoalLimit}
          onChangeDifficulty={setYearlyGoalDifficulty}
          onChangeDraft={setYearlyGoalDraft}
          onClose={closeYearlyGoal}
          onSave={addYearlyGoal}
          value={yearlyGoalDraft}
          visible={isYearlyGoalOpen}
          width={popupWidth}
        />
        <TodayTasksModal
          errorMessage={goalError}
          hasUsedTaskRefresh={hasUsedTaskRefresh}
          isGenerating={isGeneratingPlan}
          onAbandonGoal={abandonYearlyGoal}
          onClose={closeTodayTasks}
          onGenerate={generateAdditionalTaskForSelectedGoal}
          onGenerateTodayTasks={generateBasicTasksForSelectedGoal}
          onOpenGoal={openYearlyGoalFromTodayTasks}
          onRefreshOneTask={refreshOneIncompleteTaskForSelectedGoal}
          onSelectGoal={setSelectedTaskGoalId}
          onToggleGoalCompletion={toggleYearlyGoalCompletion}
          onToggleTask={toggleTask}
          plans={dailyPlans}
          selectedGoalId={selectedTaskGoalId}
          visible={isTodayTasksOpen}
          width={popupWidth}
          yearlyGoals={activeYearlyGoals}
        />
      </View>
    </SafeAreaView>
  );
}

function getCapacityPurchaseCount(capacity: number): number {
  return clamp(
    Math.floor((capacity - initialInventorySlotCount) / inventoryExpansionSlotCount),
    0,
    maxInventoryCapacityPurchases,
  );
}

function getInventoryCapacityPrice(item: InventoryCapacityShopItem, purchaseCount: number): number {
  return item.price * (purchaseCount + 1);
}

function getGoalCapacityPrice(item: GoalCapacityShopItem, purchaseCount: number): number {
  return item.price * (purchaseCount + 1);
}

function getGoalSlotExpansionPurchaseCount(activeYearlyGoalLimit: number): number {
  return clamp(
    Math.floor((activeYearlyGoalLimit - initialActiveYearlyGoalLimit) / goalSlotExpansionCount),
    0,
    maxGoalSlotExpansionPurchases,
  );
}

function getShopItemPrice(
  item: ShopItem,
  capacityPurchaseCounts: InventoryCapacityPurchaseCounts,
  activeYearlyGoalLimit: number,
): number {
  if (item.kind === 'inventory-capacity') {
    return getInventoryCapacityPrice(item, capacityPurchaseCounts[item.id] ?? 0);
  }

  if (item.kind === 'goal-capacity') {
    return getGoalCapacityPrice(item, getGoalSlotExpansionPurchaseCount(activeYearlyGoalLimit));
  }

  return item.price;
}

function PlacedDecorObject({
  item,
  onDragEnd,
  onDragMove,
  onLongPress,
  onPress,
  petBaselineY,
  layerOrder,
  roomHeight,
  roomScale,
  x,
  y,
}: {
  item: InventoryItem;
  onDragEnd: (item: InventoryItem, pageX: number, pageY: number, didMove: boolean) => void;
  onDragMove: (item: InventoryItem, pageX: number, pageY: number) => void;
  onLongPress: (item: InventoryItem) => void;
  onPress: (item: InventoryItem) => void;
  petBaselineY: number;
  layerOrder: number;
  roomHeight: number;
  roomScale: number;
  x: number;
  y: number;
}) {
  const { t } = useI18n();
  const displayName = getLocalizedInventoryItem(item, t).name;
  const image = getItemImage(item.id);
  const presentation = getDecorPresentation(item.id);
  const height = Math.round(presentation.height * roomScale);
  const width = Math.round(presentation.width * roomScale);
  const decorBaselineY = y * roomHeight + height * 0.42;
  const keepsFloorLayer = item.id === 'pet-cushion' || item.id === 'pet-rug';
  const isInFrontOfPet = !keepsFloorLayer
    && roomHeight > 0
    && decorBaselineY > petBaselineY + 4;
  const zIndex = item.id === 'pet-rug'
    ? 0
    : (isInFrontOfPet ? 200 : 10) + layerOrder;
  const dragEnabledRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };
  const dragResponder = useMemo(() => PanResponder.create({
    onPanResponderGrant: (event) => {
      startPointRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      dragEnabledRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        dragEnabledRef.current = true;
        onLongPress(item);
      }, 260);
    },
    onPanResponderMove: (event, gestureState) => {
      if (!dragEnabledRef.current) return;

      onDragMove(
        item,
        gestureState.moveX || event.nativeEvent.pageX || startPointRef.current.x,
        gestureState.moveY || event.nativeEvent.pageY || startPointRef.current.y,
      );
    },
    onPanResponderRelease: (event, gestureState) => {
      const wasDragging = dragEnabledRef.current;
      clearLongPressTimer();
      dragEnabledRef.current = false;

      if (!wasDragging) {
        onPress(item);
        return;
      }

      const didMove = Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 6;
      onDragEnd(
        item,
        gestureState.moveX || event.nativeEvent.pageX || startPointRef.current.x,
        gestureState.moveY || event.nativeEvent.pageY || startPointRef.current.y,
        didMove,
      );
    },
    onPanResponderTerminate: (event, gestureState) => {
      const wasDragging = dragEnabledRef.current;
      clearLongPressTimer();
      dragEnabledRef.current = false;

      if (!wasDragging) return;

      const didMove = Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 6;
      onDragEnd(
        item,
        gestureState.moveX || event.nativeEvent.pageX || startPointRef.current.x,
        gestureState.moveY || event.nativeEvent.pageY || startPointRef.current.y,
        didMove,
      );
    },
    onStartShouldSetPanResponder: () => true,
  }), [item, onDragEnd, onDragMove, onLongPress, onPress]);

  return (
    <View
      {...dragResponder.panHandlers}
      accessibilityLabel={t('home.placedDecorA11y', { name: displayName })}
      accessibilityRole="button"
      style={[
        styles.placedDecorObject,
        {
          height,
          left: `${x * 100}%`,
          marginLeft: -Math.round(width / 2),
          marginTop: -Math.round(height / 2),
          top: `${y * 100}%`,
          width,
          zIndex,
        },
      ]}
    >
      {image ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={image}
          style={styles.placedDecorImage}
        />
      ) : (
        <Text style={styles.placedDecorFallback}>{item.symbol}</Text>
      )}
    </View>
  );
}

function DecorActionMenu({
  onBringForward,
  onSendBackward,
  placedItem,
  roomHeight,
  roomWidth,
  roomScale,
}: {
  onBringForward: () => void;
  onSendBackward: () => void;
  placedItem: PlacedDecorItem;
  roomHeight: number;
  roomWidth: number;
  roomScale: number;
}) {
  const { t } = useI18n();
  const presentation = getDecorPresentation(placedItem.item.id);
  const height = Math.round(presentation.height * roomScale);
  const menuWidth = 84;
  const itemCenterX = placedItem.x * roomWidth;
  const itemTop = placedItem.y * roomHeight - height / 2;
  const left = clamp(itemCenterX - menuWidth / 2, 8, Math.max(8, roomWidth - menuWidth - 8));
  const top = Math.max(8, itemTop - 28);

  return (
    <View
      style={[
        styles.decorActionMenu,
        {
          left,
          top,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={t('home.decorBringForward')}
        accessibilityRole="button"
        hitSlop={5}
        onPress={onBringForward}
        style={({ pressed }) => [
          styles.decorActionButton,
          pressed && styles.decorActionButtonPressed,
        ]}
      >
        <LayerOrderIcon activeLayer="front" />
      </Pressable>
      <Pressable
        accessibilityLabel={t('home.decorSendBackward')}
        accessibilityRole="button"
        hitSlop={5}
        onPress={onSendBackward}
        style={({ pressed }) => [
          styles.decorActionButton,
          pressed && styles.decorActionButtonPressed,
        ]}
      >
        <LayerOrderIcon activeLayer="back" />
      </Pressable>
    </View>
  );
}

function LayerOrderIcon({ activeLayer }: { activeLayer: 'back' | 'front' }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.layerOrderIcon}>
      <View
        style={[
          styles.layerOrderTile,
          styles.layerOrderTileBack,
          activeLayer === 'back' && styles.layerOrderTileBackActive,
        ]}
      />
      <View
        style={[
          styles.layerOrderTile,
          styles.layerOrderTileFront,
          activeLayer === 'front' && styles.layerOrderTileFrontActive,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#eef5ef',
    flex: 1,
  },
  shell: {
    flex: 1,
    marginHorizontal: 'auto',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  room: {
    backgroundColor: '#f2dfbd',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomBackground: {
    flex: 1,
    position: 'relative',
  },
  roomWallpaperImage: {
    height: '72%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  roomFloorImage: {
    bottom: 0,
    height: '28%',
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  placedDecorFallback: {
    color: '#fff8ea',
    fontFamily: pixelFontFamily,
    fontSize: 18,
    fontWeight: '900',
  },
  placedDecorImage: {
    height: '100%',
    width: '100%',
  },
  placedDecorObject: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 2,
  },
  placementLayer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingTop: 72,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 400,
  },
  placementHitArea: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0,
  },
  placementText: {
    color: '#35281f',
    fontFamily: pixelFontFamily,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  placementToolbar: {
    alignItems: 'center',
    backgroundColor: '#fff8ea',
    borderColor: '#3d2d28',
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 1,
  },
  returnToBagIcon: {
    height: 78,
    width: 78,
  },
  returnToBagTarget: {
    alignItems: 'center',
    bottom: 26,
    height: 88,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 88,
    zIndex: 2,
  },
  returnToBagTargetPressed: {
    opacity: 0.72,
    transform: [{ translateY: 1 }],
  },
  characterStage: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 100,
  },
  deliveryRewardError: {
    alignSelf: 'center',
    backgroundColor: '#ffe2c0',
    borderColor: '#a34c39',
    borderWidth: 2,
    bottom: 24,
    maxWidth: '88%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 50,
  },
  deliveryRewardErrorText: {
    color: '#693c31',
    fontFamily: pixelFontFamily,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
    textAlign: 'center',
  },
  decorActionButton: {
    alignItems: 'center',
    backgroundColor: '#fff4d8',
    borderColor: '#74462f',
    borderRadius: 7,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#8f593b',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 0,
    width: 40,
  },
  decorActionButtonPressed: {
    backgroundColor: '#f4dfb8',
    shadowOffset: { height: 1, width: 0 },
    transform: [{ translateY: 1 }],
  },
  decorActionMenu: {
    flexDirection: 'row',
    gap: 4,
    height: 42,
    position: 'absolute',
    width: 84,
    zIndex: 300,
  },
  layerOrderIcon: {
    height: 25,
    position: 'relative',
    width: 27,
  },
  layerOrderTile: {
    borderColor: '#74462f',
    borderRadius: 2,
    borderWidth: 2,
    height: 15,
    position: 'absolute',
    width: 17,
  },
  layerOrderTileBack: {
    backgroundColor: '#fff9e9',
    left: 1,
    top: 1,
  },
  layerOrderTileBackActive: {
    backgroundColor: '#9eb78d',
  },
  layerOrderTileFront: {
    backgroundColor: '#fff9e9',
    bottom: 1,
    right: 1,
  },
  layerOrderTileFrontActive: {
    backgroundColor: '#ed8979',
  },
  deliveryCountdownBadge: {
    alignItems: 'center',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 88,
    zIndex: 11,
  },
  deliveryCountdownText: {
    backgroundColor: 'rgba(61, 45, 40, 0.72)',
    borderColor: '#b9824f',
    borderWidth: 2,
    color: '#fff8ea',
    fontFamily: pixelFontFamily,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
