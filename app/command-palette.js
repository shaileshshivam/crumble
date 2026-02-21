// @ts-check

export const PALETTE_COMMANDS = [
  {
    id: 'add-entry',
    title: 'Add Cookie or Storage Key',
    keywords: ['add', 'cookie', 'storage', 'create']
  },
  {
    id: 'import-scope',
    title: 'Import Current Scope',
    keywords: ['import', 'json', 'cookies', 'storage']
  },
  {
    id: 'export-filtered',
    title: 'Export Filtered Results',
    keywords: ['export', 'filtered', 'copy']
  },
  {
    id: 'bulk-delete-filtered',
    title: 'Bulk Delete Filtered Cookies',
    keywords: ['bulk', 'delete', 'cookies']
  },
  {
    id: 'restore-snapshot',
    title: 'Restore Latest Snapshot',
    keywords: ['restore', 'snapshot', 'rollback']
  },
  {
    id: 'save-profile',
    title: 'Save Current Profile',
    keywords: ['profile', 'save']
  },
  {
    id: 'compare-profile',
    title: 'Compare Saved Profile',
    keywords: ['profile', 'diff', 'compare']
  },
  {
    id: 'toggle-redaction',
    title: 'Toggle Value Redaction',
    keywords: ['mask', 'redaction', 'privacy']
  }
];

/**
 * @param {string} query
 * @param {typeof PALETTE_COMMANDS} [commands]
 */
export function searchPaletteCommands(query, commands = PALETTE_COMMANDS) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...commands];
  }

  return commands.filter((command) => {
    if (command.title.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return command.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));
  });
}

/**
 * @param {string} commandId
 * @param {typeof PALETTE_COMMANDS} [commands]
 */
export function getPaletteCommand(commandId, commands = PALETTE_COMMANDS) {
  return commands.find((command) => command.id === commandId) || null;
}

