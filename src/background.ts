const FAILED_TAB_ERROR = 'Could not get active tab ID to open side panel.';
const SIDE_PANEL_UNAVAILABLE_ERROR = 'Side Panel API not available.';

export interface SidePanelApi {
  open(options: { tabId: number }): Promise<void>;
}

export interface ActionApi {
  onClicked: {
    addListener(callback: (tab: chrome.tabs.Tab) => void | Promise<void>): void;
  };
}

export async function openSidePanelForTab(
  tab: chrome.tabs.Tab | null | undefined,
  sidePanelApi: SidePanelApi
): Promise<boolean> {
  if (!tab?.id) {
    return false;
  }

  await sidePanelApi.open({ tabId: tab.id });
  return true;
}

export function registerActionClickHandler(
  actionApi: ActionApi,
  sidePanelApi: SidePanelApi | undefined,
  logger: Pick<typeof console, 'error'> = console
): void {
  actionApi.onClicked.addListener(async (tab) => {
    if (!sidePanelApi) {
      logger.error(SIDE_PANEL_UNAVAILABLE_ERROR);
      return;
    }

    try {
      const wasOpened = await openSidePanelForTab(tab, sidePanelApi);
      if (!wasOpened) {
        logger.error(FAILED_TAB_ERROR);
      }
    } catch (error) {
      logger.error('Failed to open side panel.', error);
    }
  });
}

if (typeof chrome !== 'undefined' && chrome.action) {
  registerActionClickHandler(chrome.action as unknown as ActionApi, chrome.sidePanel);
}
