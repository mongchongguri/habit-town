import type { DailyTask, GoalDifficulty } from '../goals/types';

export type GrowthStage = 'baby' | 'child' | 'teen' | 'adult';

export type TaskReward = {
  coins: number;
  experience: number;
};

export type RewardProgress = {
  coins: number;
  experience: number;
  level: number;
  stage: GrowthStage;
  totalExperience: number;
};

export type CareMeterKey = 'cleanliness' | 'hunger' | 'loneliness';

export type CareMeterValues = Record<CareMeterKey, number>;

export const experiencePerGrowthStage = 100;
export const maxRewardCoins = 99999;
export const careActionMeterIncrease = 0.2;

export const growthStages: GrowthStage[] = ['baby', 'child', 'teen', 'adult'];

export const growthStageLabels: Record<GrowthStage, string> = {
  adult: '성체',
  baby: '아기',
  child: '어린이',
  teen: '청소년',
};

export const initialRewardProgress: RewardProgress = {
  coins: 2000,
  experience: 0,
  level: 1,
  stage: 'baby',
  totalExperience: 0,
};

export const initialCareMeters: CareMeterValues = {
  cleanliness: 0,
  hunger: 0,
  loneliness: 0,
};

export function calculateTaskReward(
  task: DailyTask,
  goalDifficulty: GoalDifficulty,
): TaskReward {
  const effortUnits = Math.max(1, Math.ceil(task.estimatedMinutes / 5));
  const difficultyMultiplier = getDifficultyMultiplier(goalDifficulty);
  const experience = Math.round(effortUnits * 6 * difficultyMultiplier);

  return {
    coins: experience * 3,
    experience,
  };
}

export function applyTaskReward(
  progress: RewardProgress,
  reward: TaskReward,
): RewardProgress {
  let nextExperience = progress.experience + reward.experience;
  let nextLevel = progress.level;
  let nextStageIndex = Math.max(0, growthStages.indexOf(progress.stage));

  while (nextExperience >= experiencePerGrowthStage) {
    nextExperience -= experiencePerGrowthStage;
    nextLevel += 1;

    if (nextStageIndex < growthStages.length - 1) {
      nextStageIndex += 1;
    }
  }

  return {
    coins: clampCoins(progress.coins + reward.coins),
    experience: nextExperience,
    level: nextLevel,
    stage: growthStages[nextStageIndex],
    totalExperience: progress.totalExperience + reward.experience,
  };
}

export function applyCurrencyReward(
  progress: RewardProgress,
  coins: number,
): RewardProgress {
  return {
    ...progress,
    coins: clampCoins(progress.coins + Math.max(0, Math.floor(coins))),
  };
}

export function applyExperienceReward(
  progress: RewardProgress,
  experience: number,
): RewardProgress {
  return applyTaskReward(progress, {
    coins: 0,
    experience: Math.max(0, Math.floor(experience)),
  });
}

export function applyCurrencySpend(
  progress: RewardProgress,
  coins: number,
): RewardProgress | null {
  const spendCoins = Math.max(0, Math.floor(coins));

  if (progress.coins < spendCoins) {
    return null;
  }

  return {
    ...progress,
    coins: clampCoins(progress.coins - spendCoins),
  };
}

export function applyCareMeterIncrease(
  careMeters: CareMeterValues,
  meter: CareMeterKey,
  increase = careActionMeterIncrease,
): CareMeterValues {
  return {
    ...careMeters,
    [meter]: clampRatio(careMeters[meter] + Math.max(0, increase)),
  };
}

export function normalizeRewardProgress(value: unknown): RewardProgress {
  if (!isRecord(value)) {
    return initialRewardProgress;
  }

  const stage = isGrowthStage(value.stage) ? value.stage : initialRewardProgress.stage;
  const coins = clampCoins(normalizeNumber(value.coins, initialRewardProgress.coins));
  const experience = Math.min(
    experiencePerGrowthStage - 1,
    normalizeNumber(value.experience, initialRewardProgress.experience),
  );
  const level = Math.max(1, normalizeNumber(value.level, initialRewardProgress.level));
  const totalExperience = normalizeNumber(
    value.totalExperience,
    initialRewardProgress.totalExperience,
  );

  return {
    coins,
    experience,
    level,
    stage,
    totalExperience,
  };
}

export function normalizeCareMeters(value: unknown): CareMeterValues {
  if (!isRecord(value)) {
    return initialCareMeters;
  }

  return {
    cleanliness: normalizeRatio(value.cleanliness),
    hunger: normalizeRatio(value.hunger),
    loneliness: normalizeRatio(value.loneliness),
  };
}

function getDifficultyMultiplier(difficulty: GoalDifficulty) {
  if (difficulty === 'high') {
    return 1.2;
  }

  if (difficulty === 'low') {
    return 0.85;
  }

  return 1;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function normalizeRatio(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clampRatio(value)
    : 0;
}

function clampRatio(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampCoins(coins: number) {
  return Math.min(maxRewardCoins, Math.max(0, Math.floor(coins)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGrowthStage(value: unknown): value is GrowthStage {
  return typeof value === 'string' && growthStages.includes(value as GrowthStage);
}
