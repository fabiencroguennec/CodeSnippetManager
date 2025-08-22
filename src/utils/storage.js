export const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    if (!window.localStorage) return false;
    const testKey = '__test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('localStorage non disponible:', e);
    return false;
  }
};

export const getFromStorage = (key, defaultValue = null) => {
  if (!isLocalStorageAvailable()) return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Erreur lecture storage ${key}:`, error);
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Erreur sauvegarde storage ${key}:`, error);
    return false;
  }
};