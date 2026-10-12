import { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../../../features/i18n';
import { GrowthStage, PetDefinition } from '../types';

const hamsterBabyWalkSheet = require('../../../../assets/png/animals/animations/applied/hamster/walk/hamster-baby-walk-spritesheet-v2.png');
const hamsterChildWalkSheet = require('../../../../assets/png/animals/animations/applied/hamster/walk/hamster-child-walk-spritesheet-v2.png');
const hamsterBabyDozeSheet = require('../../../../assets/png/animals/animations/applied/hamster/doze/hamster-baby-doze-spritesheet-v2.png');
const catBabyWalkSheet = require('../../../../assets/png/animals/animations/applied/cat/walk/cat-baby-walk-spritesheet-v2.png');
const catBabyDozeSheet = require('../../../../assets/png/animals/animations/applied/cat/doze/cat-baby-doze-spritesheet-v2.png');
const catChildDozeSheet = require('../../../../assets/png/animals/animations/applied/cat/doze/cat-child-doze-spritesheet-v2.png');
const catTeenDozeSheet = require('../../../../assets/png/animals/animations/applied/cat/doze/cat-teen-doze-spritesheet-v2.png');
const catAdultDozeSheet = require('../../../../assets/png/animals/animations/applied/cat/doze/cat-adult-doze-spritesheet-v2.png');
const dogBabyWalkSheet = require('../../../../assets/png/animals/animations/applied/dog/walk/dog-baby-walk-spritesheet-v2.png');
const dogBabyDozeSheet = require('../../../../assets/png/animals/animations/applied/dog/doze/dog-baby-doze-spritesheet-v2.png');
const hamsterBabyWalkFrameCount = 4;
const hamsterBabyWalkFrameDurationMs = 220;
const hamsterBabyWalkMoveDurationMs = 80;
const hamsterBabyWalkRestDurationMs = 4200;
const hamsterBabyWalkBurstDurationMs = 2200;
const hamsterBabyWalkRangeRatio = 0.45;
const hamsterBabyWalkStepRatio = 0.018;
const hamsterBabyDozeFrameCount = 4;
const hamsterBabyDozeFrameDurationMs = 560;
const hamsterBabyDozeSleepDurationMs = 12000;
const hamsterBabyDozeLoop = [1, 2, 3, 2, 1];
const hamsterBabyCushionDozeChance = 0.45;
const catChildDozeDisplayScale = 1.2;
const catTeenDozeDisplayScale = 1.1;
const catAdultDozeDisplayScale = 1.15;
const pixelatedImageStyle =
  Platform.OS === 'web'
    ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle)
    : null;

type StaticPetProps = {
  animationActionTrigger?: {
    action: 'doze' | 'walk';
    nonce: number;
  };
  dozeZone?: {
    centerX: number;
    radius: number;
  };
  movementPaused?: boolean;
  onHorizontalOffsetChange?: (offset: number) => void;
  onPress?: () => void;
  pet: PetDefinition;
  petName: string;
  size: number;
  stage: GrowthStage;
};

export function StaticPet({
  animationActionTrigger,
  dozeZone,
  movementPaused = false,
  onHorizontalOffsetChange,
  onPress,
  pet,
  petName,
  size,
  stage,
}: StaticPetProps) {
  const { t } = useI18n();
  const petSource = pet.stages[stage];
  const [walkFrameIndex, setWalkFrameIndex] = useState(0);
  const [walkDirection, setWalkDirection] = useState<'left' | 'right'>('left');
  const [walkOffsetX, setWalkOffsetX] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [isDozing, setIsDozing] = useState(false);
  const [dozeFrameIndex, setDozeFrameIndex] = useState(0);
  const isInsideDozeZoneRef = useRef(false);
  const shouldUseHamsterBabyAnimation = pet.id === 'hamster' && stage === 'baby';
  const shouldUseHamsterChildWalkAnimation = pet.id === 'hamster' && stage === 'child';
  const shouldUseCatBabyWalkAnimation = pet.id === 'cat' && stage === 'baby';
  const shouldUseCatBabyDozeAnimation = pet.id === 'cat' && stage === 'baby';
  const shouldUseCatChildDozeAnimation = pet.id === 'cat' && stage === 'child';
  const shouldUseCatTeenDozeAnimation = pet.id === 'cat' && stage === 'teen';
  const shouldUseCatAdultDozeAnimation = pet.id === 'cat' && stage === 'adult';
  const shouldUseDogBabyWalkAnimation = pet.id === 'dog' && stage === 'baby';
  const shouldUseDogBabyDozeAnimation = pet.id === 'dog' && stage === 'baby';
  const shouldUseWalkAnimation = shouldUseHamsterBabyAnimation
    || shouldUseHamsterChildWalkAnimation
    || shouldUseCatBabyWalkAnimation
    || shouldUseDogBabyWalkAnimation;
  const shouldUseDozeAnimation = shouldUseHamsterBabyAnimation
    || shouldUseCatBabyDozeAnimation
    || shouldUseCatChildDozeAnimation
    || shouldUseCatTeenDozeAnimation
    || shouldUseCatAdultDozeAnimation
    || shouldUseDogBabyDozeAnimation;
  const walkSpriteSheet = shouldUseCatBabyWalkAnimation
    ? catBabyWalkSheet
    : shouldUseDogBabyWalkAnimation
      ? dogBabyWalkSheet
      : shouldUseHamsterChildWalkAnimation
        ? hamsterChildWalkSheet
        : hamsterBabyWalkSheet;
  const dozeSpriteSheet = shouldUseCatAdultDozeAnimation
    ? catAdultDozeSheet
    : shouldUseCatTeenDozeAnimation
      ? catTeenDozeSheet
      : shouldUseCatChildDozeAnimation
        ? catChildDozeSheet
        : shouldUseCatBabyDozeAnimation
          ? catBabyDozeSheet
          : shouldUseDogBabyDozeAnimation
            ? dogBabyDozeSheet
            : hamsterBabyDozeSheet;
  const dozeDisplaySize = shouldUseCatChildDozeAnimation
    ? Math.round(size * catChildDozeDisplayScale)
    : shouldUseCatTeenDozeAnimation
      ? Math.round(size * catTeenDozeDisplayScale)
      : shouldUseCatAdultDozeAnimation
        ? Math.round(size * catAdultDozeDisplayScale)
        : size;
  const shouldFlipWalkFrame =
    ((shouldUseHamsterBabyAnimation || shouldUseHamsterChildWalkAnimation) && walkDirection === 'right')
    || ((shouldUseCatBabyWalkAnimation || shouldUseDogBabyWalkAnimation) && walkDirection === 'left');
  const walkRange = Math.round(size * hamsterBabyWalkRangeRatio);
  const walkStep = Math.max(2, Math.round(size * hamsterBabyWalkStepRatio));
  const containerStyle = [
    styles.staticPetWrap,
    {
      height: size,
      width: size,
    },
    shouldUseWalkAnimation
      ? {
        transform: [{ translateX: walkOffsetX }],
      }
      : null,
  ];
  const content = (
    <>
      <View
        style={[
          styles.characterShadow,
          {
            top: Math.round(size * 0.76),
            width: Math.round(size * 0.9),
          },
        ]}
      />
      {shouldUseWalkAnimation && isWalking ? (
        <View
          style={[
            styles.walkFrame,
            { height: size, width: size },
            shouldFlipWalkFrame ? styles.walkFrameFacingRight : null,
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={walkSpriteSheet}
            style={[
              styles.walkSpriteSheet,
              pixelatedImageStyle,
              {
                height: size,
                transform: [{ translateX: -size * walkFrameIndex }],
                width: size * hamsterBabyWalkFrameCount,
              },
            ]}
          />
        </View>
      ) : shouldUseDozeAnimation && isDozing ? (
        <View style={[styles.walkFrame, { height: dozeDisplaySize, width: dozeDisplaySize }]}>
          <Image
            accessibilityIgnoresInvertColors
            source={dozeSpriteSheet}
            style={[
              styles.walkSpriteSheet,
              pixelatedImageStyle,
              {
                height: dozeDisplaySize,
                transform: [{ translateX: -dozeDisplaySize * dozeFrameIndex }],
                width: dozeDisplaySize * hamsterBabyDozeFrameCount,
              },
            ]}
          />
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          source={petSource}
          style={[
            styles.activePetSprite,
            pixelatedImageStyle,
            {
              height: size,
              width: size,
            },
          ]}
        />
      )}
    </>
  );

  useEffect(() => {
    if (!shouldUseWalkAnimation) {
      setWalkFrameIndex(0);
      setWalkDirection('left');
      setWalkOffsetX(0);
      setIsWalking(false);
      isInsideDozeZoneRef.current = false;
    }

    if (!shouldUseDozeAnimation) {
      setIsDozing(false);
      setDozeFrameIndex(0);
    }

    if (!isWalking) {
      setWalkFrameIndex(0);
      return;
    }

    const intervalId = setInterval(() => {
      setWalkFrameIndex((current) => (current + 1) % hamsterBabyWalkFrameCount);
    }, hamsterBabyWalkFrameDurationMs);

    return () => clearInterval(intervalId);
  }, [isWalking, shouldUseDozeAnimation, shouldUseWalkAnimation]);

  useEffect(() => {
    if (!animationActionTrigger) {
      return;
    }

    if (animationActionTrigger.action === 'walk' && shouldUseWalkAnimation && !movementPaused) {
      setIsDozing(false);
      setDozeFrameIndex(0);
      setIsWalking(true);
      setWalkFrameIndex(0);
      return;
    }

    if (animationActionTrigger.action === 'doze' && shouldUseDozeAnimation) {
      setIsWalking(false);
      setIsDozing(true);
      setDozeFrameIndex(1);
    }
  }, [
    animationActionTrigger,
    movementPaused,
    shouldUseDozeAnimation,
    shouldUseWalkAnimation,
  ]);

  useEffect(() => {
    if (!shouldUseWalkAnimation || movementPaused) {
      return;
    }

    if (isDozing) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (isWalking) {
        setIsWalking(false);
        return;
      }

      setIsWalking(true);
    }, isWalking ? hamsterBabyWalkBurstDurationMs : hamsterBabyWalkRestDurationMs);

    return () => clearTimeout(timeoutId);
  }, [isDozing, isWalking, movementPaused, shouldUseWalkAnimation]);

  useEffect(() => {
    if (movementPaused && isWalking) {
      setIsWalking(false);
      setWalkFrameIndex(0);
    }
  }, [isWalking, movementPaused]);

  useEffect(() => {
    if (!shouldUseDozeAnimation || !isDozing) {
      return;
    }

    let loopIndex = 0;
    setDozeFrameIndex(hamsterBabyDozeLoop[loopIndex]);

    const intervalId = setInterval(() => {
      loopIndex = (loopIndex + 1) % hamsterBabyDozeLoop.length;
      setDozeFrameIndex(hamsterBabyDozeLoop[loopIndex]);
    }, hamsterBabyDozeFrameDurationMs);

    return () => clearInterval(intervalId);
  }, [isDozing, shouldUseDozeAnimation]);

  useEffect(() => {
    if (!shouldUseDozeAnimation || !isDozing) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsDozing(false);
      setDozeFrameIndex(0);
    }, hamsterBabyDozeSleepDurationMs);

    return () => clearTimeout(timeoutId);
  }, [isDozing, shouldUseDozeAnimation]);

  useEffect(() => {
    if (!shouldUseWalkAnimation || !isWalking || movementPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      setWalkOffsetX((current) => {
        const next = current + (walkDirection === 'right' ? walkStep : -walkStep);
        const isInsideDozeZone = dozeZone
          ? Math.abs(next - dozeZone.centerX) <= dozeZone.radius
          : false;

        if (
          shouldUseDozeAnimation
          && isInsideDozeZone
          && !isInsideDozeZoneRef.current
          && Math.random() < hamsterBabyCushionDozeChance
        ) {
          isInsideDozeZoneRef.current = true;
          setIsWalking(false);
          setIsDozing(true);
          setDozeFrameIndex(1);
          return next;
        }

        isInsideDozeZoneRef.current = isInsideDozeZone;

        if (next >= walkRange) {
          setWalkDirection('left');
          return walkRange;
        }

        if (next <= -walkRange) {
          setWalkDirection('right');
          return -walkRange;
        }

        return next;
      });
    }, hamsterBabyWalkMoveDurationMs);

    return () => clearInterval(intervalId);
  }, [dozeZone, isWalking, movementPaused, shouldUseDozeAnimation, shouldUseWalkAnimation, walkDirection, walkRange, walkStep]);

  useEffect(() => {
    onHorizontalOffsetChange?.(walkOffsetX);
  }, [onHorizontalOffsetChange, walkOffsetX]);

  useEffect(() => {
    isInsideDozeZoneRef.current = false;
  }, [dozeZone?.centerX, dozeZone?.radius]);

  const handlePress = () => {
    onPress?.();
  };

  if (!onPress) {
    return (
      <View
        accessibilityLabel={t('pet.a11y.image', { name: petName })}
        style={containerStyle}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={t('pet.a11y.status', { name: petName })}
      accessibilityRole="button"
      onPress={handlePress}
      style={containerStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activePetSprite: {
    resizeMode: 'contain',
  },
  characterShadow: {
    backgroundColor: '#73504b',
    height: 18,
    opacity: 0.26,
    position: 'absolute',
  },
  staticPetWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  walkFrame: {
    overflow: 'hidden',
  },
  walkFrameFacingRight: {
    transform: [{ scaleX: -1 }],
  },
  walkSpriteSheet: {
    resizeMode: 'stretch',
  },
});
