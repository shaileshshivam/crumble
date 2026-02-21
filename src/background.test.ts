import { describe, expect, it, vi } from 'vitest';
import { openSidePanelForTab, registerActionClickHandler, type SidePanelApi } from './background';

describe('background runtime', () => {
  it('opens the side panel when tab id is available', async () => {
    const open = vi.fn().mockResolvedValue(undefined);
    const api: SidePanelApi = { open };

    await expect(openSidePanelForTab({ id: 23 } as chrome.tabs.Tab, api)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith({ tabId: 23 });
  });

  it('skips opening when tab id is unavailable', async () => {
    const open = vi.fn().mockResolvedValue(undefined);
    const api: SidePanelApi = { open };

    await expect(openSidePanelForTab({} as chrome.tabs.Tab, api)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('logs when side panel API is unavailable', async () => {
    const logger = { error: vi.fn() };
    let handler: ((tab: chrome.tabs.Tab) => void | Promise<void>) | undefined;

    registerActionClickHandler(
      {
        onClicked: {
          addListener(callback) {
            handler = callback;
          }
        }
      },
      undefined,
      logger
    );

    expect(handler).toBeDefined();
    await handler?.({ id: 5 } as chrome.tabs.Tab);
    expect(logger.error).toHaveBeenCalledWith('Side Panel API not available.');
  });
});
