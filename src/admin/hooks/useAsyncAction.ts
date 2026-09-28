/**
 * useAsyncAction
 *
 * Wraps an async function so consumers can track loading/error state
 * without boilerplate.
 */

import { useCallback, useRef, useState } from 'react';

export interface AsyncActionState<T> {
  loading: boolean;
  error: string | undefined;
  data: T | undefined;
}

export function useAsyncAction<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
) {
  const [state, setState] = useState<AsyncActionState<Result>>({
    loading: false,
    error: undefined,
    data: undefined,
  });
  const activeRef = useRef(0);

  const run = useCallback(
    async (...args: Args) => {
      const invocation = activeRef.current + 1;
      activeRef.current = invocation;
      setState({ loading: true, error: undefined, data: undefined });
      try {
        const result = await fn(...args);
        if (activeRef.current === invocation) {
          setState({ loading: false, error: undefined, data: result });
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (activeRef.current === invocation) {
          setState({ loading: false, error: message, data: undefined });
        }
        throw error;
      }
    },
    [fn],
  );

  const reset = useCallback(() => {
    activeRef.current += 1;
    setState({ loading: false, error: undefined, data: undefined });
  }, []);

  return { ...state, run, reset };
}
