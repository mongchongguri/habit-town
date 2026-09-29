import { loadGoalPlannerData } from '../goals/goalRepository';
import {
  loadInventoryCapacity,
  loadInventoryItems,
} from '../inventory/inventoryRepository';
import {
  loadPetName,
  loadPetRoomName,
} from '../pets/petProfileRepository';
import { loadGiftBoxCount } from '../rewards/giftBoxRepository';
import { loadDecorPlacements } from '../room/decorPlacementRepository';

const startupPetIds = ['cat', 'hamster', 'dog'] as const;

export type StartupProgress = {
  completedStepCount: number;
  progress: number;
  stepCount: number;
};

type StartupStep = {
  progress: number;
  run: () => Promise<unknown>;
};

const startupSteps: readonly StartupStep[] = [
  {
    progress: 0.28,
    run: loadGoalPlannerData,
  },
  {
    progress: 0.48,
    run: () => Promise.all([
      loadInventoryItems(),
      loadInventoryCapacity('general'),
      loadInventoryCapacity('decor'),
    ]),
  },
  {
    progress: 0.64,
    run: loadDecorPlacements,
  },
  {
    progress: 0.84,
    run: () => Promise.all(startupPetIds.flatMap((petId) => [
      loadPetName(petId),
      loadPetRoomName(petId),
    ])),
  },
  {
    progress: 0.96,
    run: loadGiftBoxCount,
  },
];

/**
 * Warms the persisted app data before the home screen mounts.
 * A failed store is reported but does not trap the user on the splash screen.
 */
export async function runAppStartup(
  onProgress: (progress: StartupProgress) => void,
): Promise<Error[]> {
  const errors: Error[] = [];

  for (const [index, step] of startupSteps.entries()) {
    try {
      await step.run();
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    onProgress({
      completedStepCount: index + 1,
      progress: step.progress,
      stepCount: startupSteps.length,
    });
    await waitForNextPaint();
  }

  onProgress({
    completedStepCount: startupSteps.length,
    progress: 1,
    stepCount: startupSteps.length,
  });

  return errors;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
