export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushHistory<T>(
  state: HistoryState<T>,
  next: T,
  options?: { maxEntries?: number; coalesce?: boolean }
): HistoryState<T> {
  if (next === state.present) {
    return state;
  }

  if (options?.coalesce) {
    return {
      past: state.past,
      present: next,
      future: [],
    };
  }

  const limit = Math.max(1, options?.maxEntries ?? 40);
  const nextPast =
    state.past.length >= limit
      ? [...state.past.slice(state.past.length - limit + 1), state.present]
      : [...state.past, state.present];

  return {
    past: nextPast,
    present: next,
    future: [],
  };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state;
  const [next, ...rest] = state.future;
  return {
    past: [...state.past, state.present],
    present: next,
    future: rest,
  };
}

export function resetHistory<T>(initial: T): HistoryState<T> {
  return createHistory(initial);
}
