// @ts-check

/**
 * @param {string} commandId
 * @param {{ cookieScope: boolean }} context
 */
export function routePaletteCommand(commandId, context) {
  switch (commandId) {
    case 'add-entry':
      return {
        blocked: false,
        action: context.cookieScope ? 'add-cookie' : 'add-storage'
      };
    case 'import-scope':
      return { blocked: false, action: 'import-scope' };
    case 'export-filtered':
      return { blocked: false, action: 'export-filtered' };
    case 'bulk-delete-filtered':
      if (!context.cookieScope) {
        return {
          blocked: true,
          action: 'bulk-delete-filtered',
          message: 'This action is currently available only in Cookies scope.'
        };
      }
      return { blocked: false, action: 'bulk-delete-filtered' };
    case 'restore-snapshot':
      return { blocked: false, action: 'restore-snapshot' };
    case 'save-profile':
      return { blocked: false, action: 'save-profile' };
    case 'compare-profile':
      return { blocked: false, action: 'compare-profile' };
    case 'toggle-redaction':
      return { blocked: false, action: 'toggle-redaction' };
    default:
      return {
        blocked: true,
        action: 'unknown',
        message: 'Unsupported command.'
      };
  }
}

