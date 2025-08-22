import { useState, useEffect } from 'react';
import { getFromStorage, setToStorage } from '../utils/storage';

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    return getFromStorage(key, defaultValue);
  });

  useEffect(() => {
    setToStorage(key, value);
  }, [key, value]);

  return [value, setValue];
};