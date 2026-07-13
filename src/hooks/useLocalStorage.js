import { useState, useEffect } from 'react';

function readValue(key, initialValue) {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

/**
 * Synchronizes state with localStorage. If the `key` changes at runtime
 * (e.g. a different user logs in and the key is namespaced by their id),
 * the stored value is re-read for the new key instead of leaking the old
 * user's data.
 */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => readValue(key, initialValue));

  // Key changed since last render -> re-read the new key's value synchronously.
  // (setState during render makes React restart with the fresh value before
  //  the write-effect below runs, so we never write the old value to the new key.)
  // Tracked via state (not a ref) so it's safe to read/adjust during render.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setStoredValue(readValue(key, initialValue));
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
