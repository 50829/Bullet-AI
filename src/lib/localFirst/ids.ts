let optimisticIdCounter = 0;

export function createOptimisticId() {
  optimisticIdCounter = (optimisticIdCounter + 1) % 1000;
  return Date.now() * 1000 + optimisticIdCounter;
}
