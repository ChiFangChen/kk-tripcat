import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import * as storage from "../utils/storage";

/**
 * Like useState, but the value is persisted to localStorage under `key`
 * (prefixed by the storage layer) and restored on the next mount. Used to
 * remember in-app navigation (e.g. the active Notes sub-tab or Settings page)
 * so reopening a tab lands on the last-viewed page.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(
    () => storage.getItem<T>(key) ?? defaultValue,
  );

  useEffect(() => {
    storage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
}
