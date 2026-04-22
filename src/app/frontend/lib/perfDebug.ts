type PerfGlobal = typeof globalThis & {
  __GOLF_DEBUG_PERF__?: boolean;
};

export function isPerfDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;

  const perfGlobal = globalThis as PerfGlobal;
  const globalFlag = perfGlobal.__GOLF_DEBUG_PERF__ === true;
  const storageFlag =
    typeof window !== 'undefined' &&
    window.localStorage.getItem('golf:debug-perf') === '1';

  return globalFlag || storageFlag;
}
