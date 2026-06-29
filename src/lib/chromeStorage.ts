/**
 * Custom redux-persist storage adapter for Chrome Extension environments.
 *
 * The default `redux-persist/lib/storage` uses `window.localStorage`, which
 * is NOT available in Chrome extension content scripts or service workers.
 * This adapter wraps `chrome.storage.local` to work in those contexts.
 *
 * Falls back gracefully to localStorage when running outside an extension
 * (e.g. during local dev with `vite dev`).
 */

const isChromeExtension =
  typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

const chromeStorage = {
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result: Record<string, unknown>) => {
        const value = result[key];
        resolve(typeof value === 'string' ? value : null);
      });
    });
  },

  setItem: (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  },

  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve());
    });
  },
};

const localStorageFallback = {
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem: (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export default isChromeExtension ? chromeStorage : localStorageFallback;
