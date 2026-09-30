const giftBoxCountStorageKey = 'habit-town.gift-box.count.v1';
export const maxGiftBoxCount = 5;

let memoryGiftBoxCount: number | null = null;

export async function loadGiftBoxCount(): Promise<number> {
  return readGiftBoxCount();
}

export async function increaseGiftBoxCount(amount = 1): Promise<number> {
  const nextCount = clampGiftBoxCount(readGiftBoxCount() + amount);
  writeGiftBoxCount(nextCount);

  return nextCount;
}

export async function consumeGiftBox(): Promise<number | null> {
  const currentCount = readGiftBoxCount();

  if (currentCount <= 0) {
    return null;
  }

  const nextCount = currentCount - 1;
  writeGiftBoxCount(nextCount);

  return nextCount;
}

function readGiftBoxCount(): number {
  if (memoryGiftBoxCount !== null) {
    return memoryGiftBoxCount;
  }

  const storage = getBrowserStorage();
  const count = storage ? Number(storage.getItem(giftBoxCountStorageKey)) : 0;

  memoryGiftBoxCount = clampGiftBoxCount(count);
  return memoryGiftBoxCount;
}

function clampGiftBoxCount(count: number): number {
  return Number.isInteger(count) && count > 0 ? Math.min(count, maxGiftBoxCount) : 0;
}

function writeGiftBoxCount(count: number): void {
  memoryGiftBoxCount = count;
  const storage = getBrowserStorage();

  if (!storage) return;

  try {
    storage.setItem(giftBoxCountStorageKey, String(count));
  } catch {
    // In-memory state keeps the gift box count usable when browser persistence is unavailable.
  }
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
