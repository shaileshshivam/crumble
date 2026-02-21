// @ts-check

/**
 * Registers listeners that refresh data when the active browsing context changes.
 *
 * @param {() => void} onRefresh
 */
export function setupActiveTabRefreshListeners(onRefresh) {
  if (typeof onRefresh !== 'function' || !chrome.tabs) {
    return;
  }

  chrome.tabs.onActivated.addListener(() => {
    onRefresh();
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!tab || !tab.active) return;
    if (changeInfo.status === 'complete' || typeof changeInfo.url === 'string') {
      onRefresh();
    }
  });

  if (chrome.windows && chrome.windows.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        onRefresh();
      }
    });
  }
}
