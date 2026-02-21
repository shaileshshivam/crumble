// @ts-check

/**
 * @returns {Promise<chrome.tabs.Tab | null>}
 */
export function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(tabs && tabs.length > 0 ? tabs[0] : null);
    });
  });
}

/**
 * @returns {Promise<chrome.cookies.Cookie[]>}
 */
export function getAllCookies() {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({}, (cookies) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(cookies || []);
    });
  });
}
