/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
//
// Legacy imperative UI controller for the Chrome side panel.
// This file uses @ts-nocheck because it performs extensive DOM manipulation
// with `getElementById` and event delegation patterns that are difficult to
// type without a complete rewrite. All business logic has been extracted to
// properly typed modules in `app/`.
//
// Migration path: incrementally extract rendering sections into typed React
// components within `src/components/` and wire them into `App.tsx`.


import { getAllCookies, queryActiveTab } from '../app/chrome-api.js';
import {
    canEditCurrentDomain,
    isCookieInCurrentDomain,
    parseCurrentDomainContext,
    suggestDomainForCookie
} from '../app/domain-context.js';
import {
    deriveCookieUrl,
    filterCookiesForActiveView,
    getCookieStorageKey,
    groupCookiesByDomain as groupCookiesByDomainUtil,
    parseDateToUnixSeconds as parseDateToUnixSecondsUtil,
    sortCookiesByPinned
} from '../app/cookie-data.js';
import {
    BULK_DELETE_TYPE,
    createBulkDeleteConfirmationPhrase,
    createBulkDeletePlan,
    isBulkDeleteConfirmationValid
} from '../app/bulk-delete-plan.js';
import { createCookieImportPlan, mapCookiesForExport } from '../app/cookie-transfer.js';
import {
    ensureStorageBridgeReady,
    getStorageEntries,
    removeStorageEntry,
    setStorageEntry,
    STORAGE_AREA
} from '../app/storage-bridge.js';
import {
    filterStorageEntries as filterStorageEntriesBySearch,
    normalizeStorageEntries,
    sortStorageEntriesByPinned,
    sortStorageEntries
} from '../app/storage-view.js';
import { normalizeStorageMutationInput, planStorageMutation } from '../app/storage-mutation.js';
import {
    createStorageExportPayload,
    parseStorageAreaFromImportPayload,
    parseStorageImportPayload
} from '../app/storage-transfer.js';
import { getPageSlice, getTotalPages as getTotalPagesUtil } from '../app/pagination.js';
import { loadPinnedCookiesFromStorage, savePinnedCookiesToStorage } from '../app/pinned-cookies-store.js';
import {
    buildRestoreCookieSetOperations,
    createDeleteSnapshot,
    loadDeleteSnapshot,
    saveDeleteSnapshot
} from '../app/delete-snapshot.js';
import {
    createProfileRecord,
    loadProfileRecords,
    upsertProfileRecord
} from '../app/profile-store.js';
import { diffProfileState } from '../app/profile-diff.js';
import {
    createProfileExportPayload,
    parseProfileImportPayload
} from '../app/profile-schema.js';
import { evaluateCookiePolicies } from '../app/policy-checks.js';
import { loadRedactionMode, redactValue, saveRedactionMode } from '../app/redaction.js';
import { PALETTE_COMMANDS, searchPaletteCommands } from '../app/command-palette.js';
import { routePaletteCommand } from '../app/command-routing.js';
import { setupActiveTabRefreshListeners } from '../app/tab-refresh.js';
import {
    isTransientStorageBridgeErrorMessage,
    parseJsonCandidate
} from './panel-utils';

let hasInitializedSidePanelApp = false;
let initializeAttempts = 0;
const MAX_INITIALIZE_ATTEMPTS = 30;
export const REQUIRED_ELEMENT_IDS = [
    'add-cookie-btn',
    'all-domains-content',
    'all-domains-cookies',
    'all-domains-tab',
    'all-next-page',
    'all-prev-page',
    'bulk-delete-confirm-input',
    'bulk-delete-confirmation-phrase',
    'bulk-delete-dropdown',
    'bulk-delete-error',
    'bulk-delete-modal',
    'bulk-delete-modal-title',
    'bulk-delete-preview-list',
    'bulk-delete-preview-meta',
    'bulk-delete-summary',
    'cancel-bulk-delete-btn',
    'cancel-cookie-modal-btn',
    'cancel-import-modal-btn',
    'cancel-storage-modal-btn',
    'clear-search',
    'close-bulk-delete-modal',
    'close-command-palette-btn',
    'close-command-palette-modal',
    'close-cookie-modal',
    'close-import-modal',
    'close-profile-diff-btn',
    'close-profile-diff-modal',
    'close-storage-modal',
    'command-palette-error',
    'command-palette-input',
    'command-palette-list',
    'command-palette-modal',
    'compare-profile-btn',
    'confirm-bulk-delete-btn',
    'cookie-count',
    'cookie-edit-modal',
    'cookie-form',
    'cookie-form-domain',
    'cookie-form-error',
    'cookie-form-expirationDate',
    'cookie-form-httpOnly',
    'cookie-form-name',
    'cookie-form-path',
    'cookie-form-sameSite',
    'cookie-form-secure',
    'cookie-form-storeId',
    'cookie-form-value',
    'cookie-modal-title',
    'current-domain-content',
    'current-domain-cookies',
    'current-domain-tab',
    'current-next-page',
    'current-prev-page',
    'delete-filtered-btn',
    'delete-nonpinned-filtered-btn',
    'delete-session-filtered-btn',
    'export-all-btn',
    'export-domain-btn',
    'export-dropdown',
    'export-filtered-btn',
    'export-profile-btn',
    'import-confirm-btn',
    'import-cookies-btn',
    'import-error',
    'import-json-area',
    'import-modal',
    'import-modal-description',
    'import-modal-title',
    'import-profile-btn',
    'info-title',
    'open-command-palette-btn',
    'profile-diff-error',
    'profile-diff-list',
    'profile-diff-modal',
    'profile-diff-summary',
    'profile-select',
    'profiles-dropdown',
    'restore-snapshot-btn',
    'save-profile-btn',
    'scope-cookies-btn',
    'scope-localstorage-btn',
    'scope-sessionstorage-btn',
    'search-input',
    'search-results-info',
    'storage-edit-modal',
    'storage-form',
    'storage-form-error',
    'storage-form-key',
    'storage-form-original-key',
    'storage-form-value',
    'storage-modal-title',
    'toggle-redaction-btn'
];

function getMissingRequiredElementId() {
    return REQUIRED_ELEMENT_IDS.find((id) => document.getElementById(id) === null) ?? null;
}

export function initializeSidePanelApp() {
    if (hasInitializedSidePanelApp) {
        return;
    }

    const missingElementId = getMissingRequiredElementId();
    if (missingElementId) {
        initializeAttempts += 1;
        if (initializeAttempts <= MAX_INITIALIZE_ATTEMPTS) {
            requestAnimationFrame(initializeSidePanelApp);
            return;
        }

        console.error(
            `Crumble UI failed to initialize. Missing required element: #${missingElementId}`
        );
        return;
    }

    initializeAttempts = 0;
    hasInitializedSidePanelApp = true;
    try {
        // --- Const Declarations ---
        const currentDomainTab = document.getElementById('current-domain-tab');
        const allDomainsTab = document.getElementById('all-domains-tab');
        const scopeCookiesBtn = document.getElementById('scope-cookies-btn');
        const scopeLocalStorageBtn = document.getElementById('scope-localstorage-btn');
        const scopeSessionStorageBtn = document.getElementById('scope-sessionstorage-btn');
        const currentDomainContent = document.getElementById('current-domain-content');
        const allDomainsContent = document.getElementById('all-domains-content');
        const currentDomainCookiesContainer = document.getElementById('current-domain-cookies');
        const allDomainsCookiesContainer = document.getElementById('all-domains-cookies');
        const infoTitleElement = document.getElementById('info-title');
        const cookieCountElement = document.getElementById('cookie-count');
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search');
        const searchResultsInfo = document.getElementById('search-results-info');
        const currentPrevPageBtn = document.getElementById('current-prev-page');
        const currentNextPageBtn = document.getElementById('current-next-page');
        const allPrevPageBtn = document.getElementById('all-prev-page');
        const allNextPageBtn = document.getElementById('all-next-page');

        // Feature 2 Consts
        const addCookieBtn = document.getElementById('add-cookie-btn');
        const importCookiesBtn = document.getElementById('import-cookies-btn');
        const exportAllBtn = document.getElementById('export-all-btn');
        const exportFilteredBtn = document.getElementById('export-filtered-btn');
        const exportDomainBtn = document.getElementById('export-domain-btn');
        const deleteFilteredBtn = document.getElementById('delete-filtered-btn');
        const deleteSessionFilteredBtn = document.getElementById('delete-session-filtered-btn');
        const deleteNonPinnedFilteredBtn = document.getElementById('delete-nonpinned-filtered-btn');
        const restoreSnapshotBtn = document.getElementById('restore-snapshot-btn');
        const toggleRedactionBtn = document.getElementById('toggle-redaction-btn');
        const openCommandPaletteBtn = document.getElementById('open-command-palette-btn');
        const saveProfileBtn = document.getElementById('save-profile-btn');
        const compareProfileBtn = document.getElementById('compare-profile-btn');
        const exportProfileBtn = document.getElementById('export-profile-btn');
        const importProfileBtn = document.getElementById('import-profile-btn');
        const profilesDropdown = document.getElementById('profiles-dropdown');
        const exportDropdown = document.getElementById('export-dropdown');
        const bulkDeleteDropdown = document.getElementById('bulk-delete-dropdown');

        // Cookie Modal Elements
        const cookieEditModal = document.getElementById('cookie-edit-modal');
        const cookieModalTitle = document.getElementById('cookie-modal-title');
        const closeCookieModalBtn = document.getElementById('close-cookie-modal');
        const cancelCookieModalBtn = document.getElementById('cancel-cookie-modal-btn');
        const cookieForm = document.getElementById('cookie-form');
        const cookieFormError = document.getElementById('cookie-form-error');
        const cookieFormStoreId = document.getElementById('cookie-form-storeId');
        const cookieFormName = document.getElementById('cookie-form-name');
        const cookieFormValue = document.getElementById('cookie-form-value');
        const cookieFormDomain = document.getElementById('cookie-form-domain');
        const cookieFormPath = document.getElementById('cookie-form-path');
        const cookieFormExpirationDate = document.getElementById('cookie-form-expirationDate');
        const cookieFormSecure = document.getElementById('cookie-form-secure');
        const cookieFormHttpOnly = document.getElementById('cookie-form-httpOnly');
        const cookieFormSameSite = document.getElementById('cookie-form-sameSite');

        // Import Modal Elements
        const importModal = document.getElementById('import-modal');
        const closeImportModalBtn = document.getElementById('close-import-modal');
        const cancelImportModalBtn = document.getElementById('cancel-import-modal-btn');
        const importModalTitle = document.getElementById('import-modal-title');
        const importModalDescription = document.getElementById('import-modal-description');
        const importJsonArea = document.getElementById('import-json-area');
        const importConfirmBtn = document.getElementById('import-confirm-btn');
        const importError = document.getElementById('import-error');

        // Storage Modal Elements
        const storageEditModal = document.getElementById('storage-edit-modal');
        const storageModalTitle = document.getElementById('storage-modal-title');
        const closeStorageModalBtn = document.getElementById('close-storage-modal');
        const cancelStorageModalBtn = document.getElementById('cancel-storage-modal-btn');
        const storageForm = document.getElementById('storage-form');
        const storageFormOriginalKey = document.getElementById('storage-form-original-key');
        const storageFormKey = document.getElementById('storage-form-key');
        const storageFormValue = document.getElementById('storage-form-value');
        const storageFormError = document.getElementById('storage-form-error');

        // Bulk Delete Preview Modal Elements
        const bulkDeleteModal = document.getElementById('bulk-delete-modal');
        const bulkDeleteModalTitle = document.getElementById('bulk-delete-modal-title');
        const closeBulkDeleteModalBtn = document.getElementById('close-bulk-delete-modal');
        const cancelBulkDeleteModalBtn = document.getElementById('cancel-bulk-delete-btn');
        const confirmBulkDeleteModalBtn = document.getElementById('confirm-bulk-delete-btn');
        const bulkDeleteSummary = document.getElementById('bulk-delete-summary');
        const bulkDeletePreviewMeta = document.getElementById('bulk-delete-preview-meta');
        const bulkDeletePreviewList = document.getElementById('bulk-delete-preview-list');
        const bulkDeleteConfirmationPhrase = document.getElementById('bulk-delete-confirmation-phrase');
        const bulkDeleteConfirmInput = document.getElementById('bulk-delete-confirm-input');
        const bulkDeleteError = document.getElementById('bulk-delete-error');

        // Profile Diff Modal Elements
        const profileDiffModal = document.getElementById('profile-diff-modal');
        const closeProfileDiffModalBtn = document.getElementById('close-profile-diff-modal');
        const closeProfileDiffBtn = document.getElementById('close-profile-diff-btn');
        const profileSelect = document.getElementById('profile-select');
        const profileDiffSummary = document.getElementById('profile-diff-summary');
        const profileDiffList = document.getElementById('profile-diff-list');
        const profileDiffError = document.getElementById('profile-diff-error');

        // Command Palette Modal Elements
        const commandPaletteModal = document.getElementById('command-palette-modal');
        const closeCommandPaletteModalBtn = document.getElementById('close-command-palette-modal');
        const closeCommandPaletteBtn = document.getElementById('close-command-palette-btn');
        const commandPaletteInput = document.getElementById('command-palette-input');
        const commandPaletteList = document.getElementById('command-palette-list');
        const commandPaletteError = document.getElementById('command-palette-error');

        // JSON Viewer Modal Elements
        const jsonViewModal = document.getElementById('json-view-modal');
        const closeJsonViewModalBtn = document.getElementById('close-json-view-modal');
        const closeJsonViewBtn = document.getElementById('close-json-view-btn');
        const jsonViewTitle = document.getElementById('json-view-title');
        const jsonViewTree = document.getElementById('json-view-tree');


        // --- State Variables ---
        let currentDomain = '';
        let currentTabUrl = '';
        let currentTabId = null;
        let allCookiesMaster = [];
        let filteredCookies = [];
        let storageEntriesMaster = [];
        let filteredStorageEntries = [];
        let storageLoadError = '';
        let storageOrigin = '';
        let pinnedCookies = {};
        let pinnedStorageEntries = {};
        const cookiesPerPage = 10;
        let allDomainsCurrentPage = 1;
        let activeTab = 'current';
        let activeScope = 'cookies';
        let pendingBulkDeletePlan = null;
        let pendingBulkDeletePhrase = '';
        let profileDiffCurrentState = null;
        let activeImportMode = 'scope';
        let redactionEnabled = loadRedactionMode(localStorage);
        let commandPaletteVisible = false;
        let refreshGeneration = 0;

        // --- Initialization ---
        loadPinnedCookies();
        setActiveScope('cookies', false);
        updateRedactionButton();
        getCurrentTabInfo(); // Fetches tab info, then cookies, then filters/renders
        setupActiveTabRefreshListeners(() => {
            void getCurrentTabInfo();
        });
        window.addEventListener('focus', () => {
            void getCurrentTabInfo();
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                void getCurrentTabInfo();
            }
        });

        // --- Event Listeners ---
        if (scopeCookiesBtn) scopeCookiesBtn.addEventListener('click', () => setActiveScope('cookies'));
        if (scopeLocalStorageBtn) scopeLocalStorageBtn.addEventListener('click', () => setActiveScope('localStorage'));
        if (scopeSessionStorageBtn) scopeSessionStorageBtn.addEventListener('click', () => setActiveScope('sessionStorage'));

        currentDomainTab.addEventListener('click', () => {
            if (activeScope !== 'cookies') return;
            if (activeTab !== 'current') {
                activeTab = 'current';
                switchTab(currentDomainTab, currentDomainContent);
                filterAndRender();
            }
        });

        allDomainsTab.addEventListener('click', () => {
            if (activeScope !== 'cookies') return;
            if (activeTab !== 'all') {
                activeTab = 'all';
                switchTab(allDomainsTab, allDomainsContent);
                allDomainsCurrentPage = 1;
                filterAndRender();
            }
        });

        searchInput.addEventListener('input', () => {
            clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
            filterAndRender();
        });

        clearSearchBtn.addEventListener('click', clearSearch);

        // Pagination Listeners (Ensure elements exist before adding listeners)
        if (currentPrevPageBtn && currentNextPageBtn) {
            currentPrevPageBtn.addEventListener('click', () => handlePagination('current', -1));
            currentNextPageBtn.addEventListener('click', () => handlePagination('current', 1));
        }
        if (allPrevPageBtn && allNextPageBtn) {
            allPrevPageBtn.addEventListener('click', () => handlePagination('all', -1));
            allNextPageBtn.addEventListener('click', () => handlePagination('all', 1));
        }

        // Feature 2 Event Listeners
        if (addCookieBtn) addCookieBtn.addEventListener('click', () => {
            if (isCookieScope()) {
                showAddCookieModal();
                return;
            }
            showAddStorageModal();
        });
        if (importCookiesBtn) importCookiesBtn.addEventListener('click', () => {
            showImportModal();
        });
        if (exportAllBtn) exportAllBtn.addEventListener('click', () => {
            handleExport('all');
        });
        if (exportFilteredBtn) exportFilteredBtn.addEventListener('click', () => {
            handleExport('filtered');
        });
        if (exportDomainBtn) exportDomainBtn.addEventListener('click', () => {
            handleExport('domain');
        });
        if (deleteFilteredBtn) deleteFilteredBtn.addEventListener('click', () => {
            if (!isCookieScope()) return showScopeGuardMessage();
            handleBulkDelete('filtered');
        });
        if (deleteSessionFilteredBtn) deleteSessionFilteredBtn.addEventListener('click', () => {
            if (!isCookieScope()) return showScopeGuardMessage();
            handleBulkDelete('session');
        });
        if (deleteNonPinnedFilteredBtn) deleteNonPinnedFilteredBtn.addEventListener('click', () => {
            if (!isCookieScope()) return showScopeGuardMessage();
            handleBulkDelete('nonpinned');
        });
        if (restoreSnapshotBtn) restoreSnapshotBtn.addEventListener('click', handleRestoreSnapshot);
        if (toggleRedactionBtn) toggleRedactionBtn.addEventListener('click', toggleRedactionMode);
        if (openCommandPaletteBtn) openCommandPaletteBtn.addEventListener('click', showCommandPaletteModal);
        if (saveProfileBtn) saveProfileBtn.addEventListener('click', handleSaveProfile);
        if (compareProfileBtn) compareProfileBtn.addEventListener('click', showProfileDiffModal);
        if (exportProfileBtn) exportProfileBtn.addEventListener('click', handleExportProfile);
        if (importProfileBtn) importProfileBtn.addEventListener('click', showProfileImportModal);

        // Cookie Modal
        if (cookieForm) cookieForm.addEventListener('submit', handleSaveCookie);
        if (closeCookieModalBtn) closeCookieModalBtn.addEventListener('click', hideCookieModal);
        if (cancelCookieModalBtn) cancelCookieModalBtn.addEventListener('click', hideCookieModal);

        // Storage Modal
        if (storageForm) storageForm.addEventListener('submit', handleSaveStorageEntry);
        if (closeStorageModalBtn) closeStorageModalBtn.addEventListener('click', hideStorageModal);
        if (cancelStorageModalBtn) cancelStorageModalBtn.addEventListener('click', hideStorageModal);

        // Bulk Delete Preview Modal
        if (closeBulkDeleteModalBtn) closeBulkDeleteModalBtn.addEventListener('click', hideBulkDeleteModal);
        if (cancelBulkDeleteModalBtn) cancelBulkDeleteModalBtn.addEventListener('click', hideBulkDeleteModal);
        if (confirmBulkDeleteModalBtn) confirmBulkDeleteModalBtn.addEventListener('click', confirmBulkDeleteFromModal);
        if (bulkDeleteConfirmInput) bulkDeleteConfirmInput.addEventListener('input', updateBulkDeleteConfirmState);

        // Profile Diff Modal
        if (closeProfileDiffModalBtn) closeProfileDiffModalBtn.addEventListener('click', hideProfileDiffModal);
        if (closeProfileDiffBtn) closeProfileDiffBtn.addEventListener('click', hideProfileDiffModal);
        if (profileSelect) profileSelect.addEventListener('change', renderSelectedProfileDiff);

        // Command Palette Modal
        if (closeCommandPaletteModalBtn) closeCommandPaletteModalBtn.addEventListener('click', hideCommandPaletteModal);
        if (closeCommandPaletteBtn) closeCommandPaletteBtn.addEventListener('click', hideCommandPaletteModal);
        if (commandPaletteInput) {
            commandPaletteInput.addEventListener('input', renderCommandPaletteResults);
            commandPaletteInput.addEventListener('keydown', handleCommandPaletteInputKeydown);
        }
        if (commandPaletteList) commandPaletteList.addEventListener('click', handleCommandPaletteClick);
        if (closeJsonViewModalBtn) closeJsonViewModalBtn.addEventListener('click', hideJsonViewerModal);
        if (closeJsonViewBtn) closeJsonViewBtn.addEventListener('click', hideJsonViewerModal);
        if (jsonViewModal) {
            jsonViewModal.addEventListener('click', (event) => {
                if (event.target === jsonViewModal) {
                    hideJsonViewerModal();
                }
            });
        }

        document.addEventListener('keydown', handleGlobalShortcut);

        // Import Modal
        if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', hideImportModal);
        if (cancelImportModalBtn) cancelImportModalBtn.addEventListener('click', hideImportModal);
        if (importConfirmBtn) importConfirmBtn.addEventListener('click', handleImport);

        // Delegated listeners for Edit/Delete buttons on cookie items
        document.body.addEventListener('click', function (event) {
            const editStorageButton = event.target.closest('.edit-storage');
            const deleteStorageButton = event.target.closest('.delete-storage');
            const editButton = event.target.closest('.edit-cookie');
            const deleteButton = event.target.closest('.delete-cookie');

            if (editStorageButton) {
                const storageItem = event.target.closest('.cookie-item');
                if (storageItem && storageItem.dataset.storageEntry) {
                    try {
                        const entry = JSON.parse(storageItem.dataset.storageEntry);
                        showEditStorageModal(entry);
                    } catch (error) {
                        console.error('Failed to parse storage entry for edit:', error);
                    }
                }
            } else if (deleteStorageButton) {
                const storageItem = event.target.closest('.cookie-item');
                if (storageItem && storageItem.dataset.storageEntry) {
                    try {
                        const entry = JSON.parse(storageItem.dataset.storageEntry);
                        handleDeleteStorageEntry(entry);
                    } catch (error) {
                        console.error('Failed to parse storage entry for delete:', error);
                    }
                }
            } else if (editButton) {
                const cookieItem = event.target.closest('.cookie-item');
                if (cookieItem && cookieItem.dataset.cookie) {
                    try {
                        const cookie = JSON.parse(cookieItem.dataset.cookie);
                        showEditCookieModal(cookie);
                    } catch (e) {
                        console.error("Failed to parse cookie data for edit:", e);
                    }
                }
            } else if (deleteButton) {
                const cookieItem = event.target.closest('.cookie-item');
                if (cookieItem && cookieItem.dataset.cookie) {
                    try {
                        const cookie = JSON.parse(cookieItem.dataset.cookie);
                        handleDeleteCookie(cookie);
                    } catch (e) {
                        console.error("Failed to parse cookie data for delete:", e);
                    }
                }
            }
        });

        // --- Core Functions ---
        function switchTab(tab, content) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(cnt => cnt.classList.remove('active'));
            tab.classList.add('active');
            content.classList.add('active');
            updateInfoBar();
            updateSearchPlaceholder();
        }

        function isCookieScope() {
            return activeScope === 'cookies';
        }

        function showScopeGuardMessage() {
            showCopiedMessage('This action is currently available only in Cookies scope.');
        }

        function getStorageAreaForScope() {
            if (activeScope === 'localStorage') return STORAGE_AREA.LOCAL;
            return STORAGE_AREA.SESSION;
        }

        function canMutateStorageScope() {
            return !isCookieScope() && currentTabId !== null && canEditCurrentDomain(currentDomain);
        }

        function setActiveScope(scope, shouldRefresh = true) {
            if (activeScope === scope && shouldRefresh) {
                return;
            }

            activeScope = scope;
            allDomainsCurrentPage = 1;
            updateScopeButtons();
            updateScopeUiState();
            updateSearchPlaceholder();
            updateInfoBar();

            if (shouldRefresh) {
                const generation = ++refreshGeneration;
                void fetchActiveScopeData(generation);
            }
        }

        function updateScopeButtons() {
            const map = {
                cookies: scopeCookiesBtn,
                localStorage: scopeLocalStorageBtn,
                sessionStorage: scopeSessionStorageBtn
            };

            Object.keys(map).forEach((scopeKey) => {
                const button = map[scopeKey];
                if (!button) return;
                button.classList.toggle('active', scopeKey === activeScope);
            });
        }

        function updateScopeUiState() {
            const cookieScope = isCookieScope();
            const domainEditable = canEditCurrentDomain(currentDomain);

            if (allDomainsTab) {
                allDomainsTab.classList.toggle('disabled', !cookieScope);
            }

            if (exportDropdown) {
                const disableExport = !cookieScope && !domainEditable;
                exportDropdown.classList.toggle('disabled', disableExport);
                if (disableExport) exportDropdown.removeAttribute('open');
            }

            if (bulkDeleteDropdown) {
                bulkDeleteDropdown.classList.toggle('disabled', !cookieScope);
                if (!cookieScope) bulkDeleteDropdown.removeAttribute('open');
            }

            if (!cookieScope) {
                hideBulkDeleteModal();
            }

            if (!cookieScope && activeTab !== 'current') {
                activeTab = 'current';
                switchTab(currentDomainTab, currentDomainContent);
            }

            if (addCookieBtn) {
                addCookieBtn.disabled = !domainEditable;
            }
            if (importCookiesBtn) {
                importCookiesBtn.disabled = !cookieScope && !domainEditable;
            }
            if (restoreSnapshotBtn) {
                restoreSnapshotBtn.disabled = !cookieScope || !hasDeleteSnapshotAvailable();
            }
        }

        async function fetchActiveScopeData(generation = refreshGeneration) {
            if (isCookieScope()) {
                await fetchCookies(generation);
                return;
            }

            await fetchStorageEntries(generation);
        }

        async function getCurrentTabInfo() {
            const generation = ++refreshGeneration;
            let domain = 'N/A';
            try {
                const tab = await queryActiveTab();
                const context = parseCurrentDomainContext(tab);
                domain = context.domain;
                currentTabUrl = context.tabUrl;
                currentTabId = tab && typeof tab.id === 'number' ? tab.id : null;
            } catch (error) {
                console.error("Failed to query active tab:", error);
                domain = 'N/A';
                currentTabUrl = '';
                currentTabId = null;
            }

            if (generation !== refreshGeneration) {
                return;
            }

            currentDomain = domain;
            updateScopeUiState();
            await fetchActiveScopeData(generation);
        }

        async function fetchCookies(generation = refreshGeneration) {
            if (currentDomainCookiesContainer) currentDomainCookiesContainer.innerHTML = '<div class="loading">Loading cookies...</div>';
            if (allDomainsCookiesContainer) allDomainsCookiesContainer.innerHTML = '<div class="loading">Loading cookies...</div>';

            try {
                const cookies = await getAllCookies();
                if (generation !== refreshGeneration) {
                    return;
                }
                allCookiesMaster = cookies;
                filterAndRender();
            } catch (error) {
                console.error("Failed to fetch cookies:", error);
                if (generation !== refreshGeneration) {
                    return;
                }
                allCookiesMaster = [];
                filterAndRender();
            }
        }

        async function fetchStorageEntries(generation = refreshGeneration, retryCount = 0) {
            if (currentDomainCookiesContainer) currentDomainCookiesContainer.innerHTML = '<div class="loading">Loading storage...</div>';
            if (allDomainsCookiesContainer) allDomainsCookiesContainer.innerHTML = '';

            storageLoadError = '';
            storageOrigin = getCurrentTabOrigin();

            if (!currentTabId || !canEditCurrentDomain(currentDomain)) {
                storageEntriesMaster = [];
                storageLoadError = 'Storage is unavailable for this page.';
                filterAndRender();
                return;
            }

            try {
                const storageArea = getStorageAreaForScope();
                await ensureStorageBridgeReady(currentTabId);
                const responseData = await getStorageEntries(currentTabId, storageArea);
                if (generation !== refreshGeneration) {
                    return;
                }
                storageEntriesMaster = normalizeStorageEntries(responseData);
                if (responseData && typeof responseData === 'object') {
                    const candidate = /** @type {{ origin?: unknown }} */ (responseData);
                    if (typeof candidate.origin === 'string' && candidate.origin) {
                        storageOrigin = candidate.origin;
                    }
                }
                filterAndRender();
            } catch (error) {
                if (generation !== refreshGeneration) {
                    return;
                }

                const errorMessage = error && error.message ? error.message : '';
                const transientTransportError = isTransientStorageBridgeErrorMessage(errorMessage);
                const shouldRetry =
                    retryCount < 2 &&
                    transientTransportError;
                if (shouldRetry) {
                    setTimeout(() => {
                        if (generation === refreshGeneration) {
                            void fetchStorageEntries(generation, retryCount + 1);
                        }
                    }, 220);
                    return;
                }

                if (!transientTransportError) {
                    console.warn('Storage bridge request failed:', errorMessage || error);
                }
                storageEntriesMaster = [];
                storageLoadError = transientTransportError
                    ? 'Storage bridge is initializing for this tab. Please wait a moment.'
                    : errorMessage || 'Failed to load storage.';
                filterAndRender();
            }
        }

        function filterAndRender() {
            if (isCookieScope()) {
                filterCookies();
                renderActiveTab();
            } else {
                filterStorageEntries();
                renderStorageEntries();
            }
            updateInfoBar();
        }

        function filterCookies() {
            const searchTerm = searchInput.value;
            const searchApplied = searchTerm.trim() !== '';

            filteredCookies = filterCookiesForActiveView({
                cookies: allCookiesMaster,
                activeTab,
                currentDomain,
                searchTerm
            });

            if (searchResultsInfo) {
                if (searchApplied) {
                    const count = filteredCookies.length;
                    searchResultsInfo.textContent = `Found ${count} result${count !== 1 ? 's' : ''}`;
                } else {
                    searchResultsInfo.textContent = '';
                }
            }


            allDomainsCurrentPage = 1;
        }

        function filterStorageEntries() {
            const searchTerm = searchInput.value;
            const searchApplied = searchTerm.trim() !== '';

            filteredStorageEntries = filterStorageEntriesBySearch(storageEntriesMaster, searchTerm);

            if (searchResultsInfo) {
                if (searchApplied) {
                    const count = filteredStorageEntries.length;
                    searchResultsInfo.textContent = `Found ${count} result${count !== 1 ? 's' : ''}`;
                } else {
                    searchResultsInfo.textContent = '';
                }
            }

        }

        function renderActiveTab() {
            if (activeTab === 'current') {
                renderCurrentDomainCookies();
            } else {
                renderAllDomainsCookies();
            }
        }

        function clearSearch() {
            if (searchInput) searchInput.value = '';
            if (clearSearchBtn) clearSearchBtn.style.display = 'none';
            filterAndRender();
        }

        // --- Rendering Functions ---
        function renderCurrentDomainCookies() {
            if (!currentDomainCookiesContainer) return;
            const sortedCurrentCookies = sortCookies(filteredCookies);
            renderPaginatedCookies(
                currentDomainCookiesContainer,
                sortedCurrentCookies,
                1,
                1,
                'current'
            );
        }

        function renderAllDomainsCookies() {
            if (!allDomainsCookiesContainer) return;
            const sortedAllCookies = sortCookies(filteredCookies);

            const pageSlice = getPageSlice(sortedAllCookies, allDomainsCurrentPage, cookiesPerPage);
            allDomainsCurrentPage = pageSlice.currentPage;
            const totalPages = pageSlice.totalPages;
            const pageItems = pageSlice.items;

            const domainGroups = groupCookiesByDomain(pageItems);
            const fullDomainGroups = groupCookiesByDomain(sortedAllCookies);

            allDomainsCookiesContainer.innerHTML = '';

            if (Object.keys(domainGroups).length === 0) {
                allDomainsCookiesContainer.innerHTML = filteredCookies.length === 0 && (!searchInput || !searchInput.value)
                    ? '<div class="no-cookies">No cookies found.</div>'
                    : '<div class="no-cookies">No matching cookies found.</div>';
                updatePagination('all', 1, 1);
                return;
            }

            Object.keys(domainGroups).sort().forEach(domain => {
                const domainSection = document.createElement('div');
                domainSection.className = 'domain-section';

                const domainHeader = document.createElement('div');
                domainHeader.className = 'domain-header';
                // Get total count for this domain from the *full* sorted list, not just the page items
                const fullDomainGroup = fullDomainGroups[domain] || [];
                domainHeader.innerHTML = `
                <span>${escapeHtml(domain)}</span>
                <span>(${fullDomainGroup.length} cookies)</span>
            `;

                const domainCookiesContent = document.createElement('div');
                domainCookiesContent.className = 'domain-cookies';

                domainGroups[domain].forEach(cookie => {
                    const cookieElement = createCookieElement(cookie);
                    if (cookieElement) domainCookiesContent.appendChild(cookieElement);
                });

                domainSection.appendChild(domainHeader);
                domainSection.appendChild(domainCookiesContent);
                allDomainsCookiesContainer.appendChild(domainSection);
            });

            updatePagination('all', allDomainsCurrentPage, totalPages);
        }

        function renderPaginatedCookies(container, items, currentPage, totalPages, type) {
            container.innerHTML = '';

            if (items.length === 0) {
                container.innerHTML = filteredCookies.length === 0 && (!searchInput || !searchInput.value)
                    ? '<div class="no-cookies">No cookies found for this domain.</div>'
                    : '<div class="no-cookies">No matching cookies found.</div>';
                updatePagination(type, 1, 1);
                return;
            }

            items.forEach(cookie => {
                const cookieElement = createCookieElement(cookie);
                if (cookieElement) container.appendChild(cookieElement);
            });

            updatePagination(type, currentPage, totalPages);
        }

        function renderStorageEntries() {
            if (!currentDomainCookiesContainer) return;

            const sortedEntries = sortStorageEntriesWithPinned(filteredStorageEntries);

            currentDomainCookiesContainer.innerHTML = '';

            if (storageLoadError) {
                currentDomainCookiesContainer.innerHTML = `<div class="no-cookies">${escapeHtml(storageLoadError)}</div>`;
                updatePagination('current', 1, 1);
                updatePagination('all', 1, 1);
                return;
            }

            if (sortedEntries.length === 0) {
                currentDomainCookiesContainer.innerHTML = filteredStorageEntries.length === 0 && (!searchInput || !searchInput.value)
                    ? '<div class="no-cookies">No storage keys found for this origin.</div>'
                    : '<div class="no-cookies">No matching storage keys found.</div>';
                updatePagination('current', 1, 1);
                updatePagination('all', 1, 1);
                return;
            }

            sortedEntries.forEach((entry) => {
                const entryElement = createStorageEntryElement(entry);
                if (entryElement) currentDomainCookiesContainer.appendChild(entryElement);
            });

            updatePagination('current', 1, 1);
            updatePagination('all', 1, 1);
        }

        function createStorageEntryElement(entry) {
            if (!entry) return null;

            const storagePinKey = getStorageEntryPinKey(entry);
            const isPinnedStorageEntry = Boolean(pinnedStorageEntries[storagePinKey]);
            const storageItem = document.createElement('div');
            storageItem.className = `cookie-item ${isPinnedStorageEntry ? 'pinned' : ''}`;
            try {
                storageItem.dataset.storageEntry = JSON.stringify(entry);
            } catch (error) {
                console.error('Failed to stringify storage entry for data attribute:', entry, error);
                storageItem.dataset.storageEntry = '{}';
            }

            const storageInner = document.createElement('div');
            storageInner.className = 'cookie-inner';
            const storageValueDisplay = getDisplayValue(entry.value);
            const storageJsonValue = parseJsonCandidate(entry.value, redactionEnabled);
            const storageValueTitle = redactionEnabled ? 'Value is masked. Click to copy actual value' : 'Click to copy value';
            const displayOrigin = storageOrigin || currentDomain || 'Unknown';
            storageInner.innerHTML = `
            <div class="cookie-header">
                <div class="cookie-name-container">
                    <i class="fas fa-thumbtack pin-icon" title="${isPinnedStorageEntry ? 'Unpin Storage Key' : 'Pin Storage Key'}"></i>
                    <div class="cookie-name" title="${escapeHtml(entry.key)}">${escapeHtml(entry.key)}</div>
                </div>
            </div>
            <div class="cookie-details">
                <span class="detail-pill"><strong>Area</strong> ${escapeHtml(activeScope)}</span>
            </div>
            <div class="cookie-value" title="${escapeHtml(storageValueTitle)}">${escapeHtml(storageValueDisplay)}</div>
            ${storageJsonValue ? '<button class="json-open-btn" type="button" title="Open formatted JSON viewer">JSON</button>' : ''}
        `;
            storageItem.appendChild(storageInner);

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'cookie-actions';
            buttonContainer.innerHTML = `
            <button class="btn secondary-btn copy-key" title="Copy storage key">
                <i class="fas fa-tag"></i> Key
            </button>
            <button class="btn secondary-btn copy-value" title="Copy storage value">
                <i class="fas fa-copy"></i> Value
            </button>
            <button class="btn secondary-btn edit-storage" title="Edit storage entry">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn secondary-btn delete-storage" title="Delete storage entry">
                <i class="fas fa-trash-alt"></i> Delete
            </button>
            <button class="btn primary-btn copy-all" title="Copy key/value as JSON">
                <i class="fas fa-clipboard"></i> Copy All
            </button>
        `;
            storageItem.appendChild(buttonContainer);

            const valueDiv = storageInner.querySelector('.cookie-value');
            const jsonViewBtn = storageInner.querySelector('.json-open-btn');
            const pinIcon = storageInner.querySelector('.pin-icon');
            const copyKeyBtn = buttonContainer.querySelector('.copy-key');
            const copyValueBtn = buttonContainer.querySelector('.copy-value');
            const copyAllBtn = buttonContainer.querySelector('.copy-all');

            if (pinIcon) {
                pinIcon.addEventListener('click', (event) => {
                    event.stopPropagation();
                    togglePinStorageEntry(entry);
                });
            }
            if (valueDiv) {
                valueDiv.addEventListener('click', () => {
                    flashCopiedElement(valueDiv);
                    copyToClipboard(entry.value, 'Storage value copied!');
                });
            }
            if (jsonViewBtn && storageJsonValue) {
                jsonViewBtn.addEventListener('click', () => {
                    showJsonViewerModal(`Storage Key: ${entry.key}`, storageJsonValue);
                });
            }
            if (copyKeyBtn) copyKeyBtn.addEventListener('click', () => copyToClipboard(entry.key, 'Storage key copied!'));
            if (copyValueBtn) copyValueBtn.addEventListener('click', () => copyToClipboard(entry.value, 'Storage value copied!'));
            if (copyAllBtn) copyAllBtn.addEventListener('click', () => {
                const entryInfo = JSON.stringify({
                    key: entry.key,
                    value: entry.value,
                    storageArea: activeScope,
                    origin: displayOrigin
                }, null, 2);
                copyToClipboard(entryInfo, 'Storage entry copied!');
            });

            return storageItem;
        }

        function createCookieElement(cookie) {
            if (!cookie) return null; // Basic safety check

            const cookieKey = getCookieStorageKey(cookie);
            const isPinned = pinnedCookies[cookieKey] || false;

            const cookieItem = document.createElement('div');
            cookieItem.className = `cookie-item ${isPinned ? 'pinned' : ''}`;
            try {
                cookieItem.dataset.cookie = JSON.stringify(cookie);
            } catch (e) {
                console.error("Failed to stringify cookie for data attribute:", cookie, e);
                cookieItem.dataset.cookie = '{}'; // Fallback
            }

            const cookieInner = document.createElement('div');
            cookieInner.className = 'cookie-inner';

            let expirationText = 'Session';
            if (cookie.expirationDate) {
                try {
                    // Check against a far future date (e.g., year 2038+)
                    if (cookie.expirationDate > 2147483647) {
                        expirationText = 'Never Expires';
                    } else {
                        expirationText = new Date(cookie.expirationDate * 1000).toLocaleString();
                    }
                } catch {
                    expirationText = 'Invalid Date';
                }
            }

            // Determine SameSite display value
            let sameSiteDisplay = 'Lax'; // Default if undefined or null
            if (cookie.sameSite === 'no_restriction') sameSiteDisplay = 'None';
            else if (cookie.sameSite === 'strict') sameSiteDisplay = 'Strict';
            else if (cookie.sameSite) sameSiteDisplay = cookie.sameSite.charAt(0).toUpperCase() + cookie.sameSite.slice(1); // Capitalize 'lax'
            const flags = [];
            if (cookie.secure) flags.push('Secure');
            if (cookie.httpOnly) flags.push('HttpOnly');
            const flagsDisplay = flags.length > 0 ? flags.join(' · ') : 'None';
            const domainDetail = activeTab === 'all'
                ? `<span class="detail-pill detail-pill-wide"><strong>Domain</strong> ${escapeHtml(cookie.domain)}</span>`
                : '';
            const policyWarnings = evaluateCookiePolicies(cookie);
            const hasPolicyWarnings = policyWarnings.length > 0;
            const policySummary = hasPolicyWarnings
                ? `${policyWarnings.length} warning${policyWarnings.length !== 1 ? 's' : ''}`
                : 'Compliant';
            const policyDetails = hasPolicyWarnings
                ? policyWarnings.map((warning) => warning.message).join(' ')
                : 'No policy warnings.';
            const cookieValueDisplay = getDisplayValue(cookie.value);
            const cookieJsonValue = parseJsonCandidate(cookie.value, redactionEnabled);
            const cookieValueTitle = redactionEnabled ? 'Value is masked. Click to copy actual value' : 'Click to copy value';

            cookieInner.innerHTML = `
            <div class="cookie-header">
                <div class="cookie-name-container">
                    <i class="fas fa-thumbtack pin-icon" title="${isPinned ? 'Unpin Cookie' : 'Pin Cookie'}"></i>
                    <div class="cookie-name" title="${escapeHtml(cookie.name)}">${escapeHtml(cookie.name)}</div>
                </div>
            </div>
            <div class="cookie-details">
                ${domainDetail}
                <span class="detail-pill"><strong>Path</strong> ${escapeHtml(cookie.path)}</span>
                <span class="detail-pill"><strong>Expires</strong> ${expirationText}</span>
                <span class="detail-pill"><strong>Flags</strong> ${escapeHtml(flagsDisplay)}</span>
                <span class="detail-pill"><strong>SameSite</strong> ${escapeHtml(sameSiteDisplay)}</span>
                <span class="policy-status ${hasPolicyWarnings ? 'warn' : 'ok'} detail-pill" title="${escapeHtml(policyDetails)}">
                    <strong>Policy</strong> ${escapeHtml(policySummary)}
                </span>
            </div>
            <div class="cookie-value" title="${escapeHtml(cookieValueTitle)}">${escapeHtml(cookieValueDisplay)}</div>
            ${cookieJsonValue ? '<button class="json-open-btn" type="button" title="Open formatted JSON viewer">JSON</button>' : ''}
        `;

            cookieItem.appendChild(cookieInner);

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'cookie-actions';
            buttonContainer.innerHTML = `
            <button class="btn secondary-btn copy-name" title="Copy cookie name">
                <i class="fas fa-tag"></i> Name
            </button>
            <button class="btn secondary-btn copy-value" title="Copy cookie value">
                <i class="fas fa-copy"></i> Value
            </button>
             <button class="btn secondary-btn edit-cookie" title="Edit Cookie">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn secondary-btn delete-cookie" title="Delete Cookie">
                <i class="fas fa-trash-alt"></i> Delete
            </button>
            <button class="btn primary-btn copy-all" title="Copy all cookie details as JSON">
                <i class="fas fa-clipboard"></i> Copy All
            </button>
        `;
            cookieItem.appendChild(buttonContainer);

            const pinIcon = cookieInner.querySelector('.pin-icon');
            const valueDiv = cookieInner.querySelector('.cookie-value');
            const jsonViewBtn = cookieInner.querySelector('.json-open-btn');
            const copyNameBtn = buttonContainer.querySelector('.copy-name');
            const copyValueBtn = buttonContainer.querySelector('.copy-value');
            const copyAllBtn = buttonContainer.querySelector('.copy-all');

            if (pinIcon) {
                pinIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePinCookie(cookie);
                });
            }
            if (valueDiv) {
                valueDiv.addEventListener('click', () => {
                    flashCopiedElement(valueDiv);
                    copyToClipboard(cookie.value, 'Cookie value copied!');
                });
            }
            if (jsonViewBtn && cookieJsonValue) {
                jsonViewBtn.addEventListener('click', () => {
                    showJsonViewerModal(`Cookie: ${cookie.name}`, cookieJsonValue);
                });
            }
            if (copyNameBtn) copyNameBtn.addEventListener('click', () => copyToClipboard(cookie.name, 'Cookie name copied!'));
            if (copyValueBtn) copyValueBtn.addEventListener('click', () => copyToClipboard(cookie.value, 'Cookie value copied!'));
            if (copyAllBtn) copyAllBtn.addEventListener('click', () => {
                const cookieInfo = JSON.stringify({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    expires: cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString() : 'Session',
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite || 'Lax'
                }, null, 2);
                copyToClipboard(cookieInfo, 'All cookie info copied!');
            });

            return cookieItem;
        }

        // --- Helper Functions ---
        function updateRedactionButton() {
            if (!toggleRedactionBtn) return;
            toggleRedactionBtn.innerHTML = `<i class="fas fa-user-secret"></i> Mask: ${redactionEnabled ? 'On' : 'Off'}`;
        }

        function toggleRedactionMode() {
            redactionEnabled = !redactionEnabled;
            saveRedactionMode(localStorage, redactionEnabled);
            updateRedactionButton();
            filterAndRender();
            showCopiedMessage(`Value masking ${redactionEnabled ? 'enabled' : 'disabled'}.`);
        }

        function getDisplayValue(value) {
            return redactValue(value, redactionEnabled);
        }

        function showJsonViewerModal(title, jsonValue) {
            if (!jsonViewModal || !jsonViewTitle || !jsonViewTree) return;

            jsonViewTitle.textContent = `${title} (JSON)`;
            jsonViewTree.innerHTML = '';
            const rootList = document.createElement('ul');
            rootList.className = 'json-tree-list';
            rootList.appendChild(createJsonTreeNode('root', jsonValue, true, 0));
            jsonViewTree.appendChild(rootList);
            jsonViewModal.style.display = 'block';
        }

        function hideJsonViewerModal() {
            if (!jsonViewModal || !jsonViewTree) return;
            jsonViewModal.style.display = 'none';
            jsonViewTree.innerHTML = '';
        }

        function createJsonTreeNode(label, value, isRoot = false, depth = 0) {
            const node = document.createElement('li');
            node.className = 'json-tree-node';

            if (value !== null && typeof value === 'object') {
                const isArray = Array.isArray(value);
                const entries = isArray
                    ? value.map((item, index) => [String(index), item])
                    : Object.entries(value);

                const details = document.createElement('details');
                details.open = depth < 1 || entries.length <= 3;

                const summary = document.createElement('summary');
                const prefix = isRoot ? '' : `${label}: `;
                summary.textContent = `${prefix}${isArray ? `Array(${entries.length})` : `Object(${entries.length})`}`;
                details.appendChild(summary);

                const children = document.createElement('ul');
                children.className = 'json-tree-list';
                entries.forEach(([entryLabel, entryValue]) => {
                    children.appendChild(createJsonTreeNode(entryLabel, entryValue, false, depth + 1));
                });
                details.appendChild(children);
                node.appendChild(details);
                return node;
            }

            const keySpan = document.createElement('span');
            keySpan.className = 'json-tree-key';
            keySpan.textContent = isRoot ? 'value' : label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'json-tree-value';
            valueSpan.textContent = formatJsonPrimitive(value);

            node.appendChild(keySpan);
            node.appendChild(document.createTextNode(': '));
            node.appendChild(valueSpan);
            return node;
        }

        function formatJsonPrimitive(value) {
            if (typeof value === 'string') {
                return `"${value}"`;
            }

            if (value === null) {
                return 'null';
            }

            if (typeof value === 'undefined') {
                return 'undefined';
            }

            return String(value);
        }

        function handleGlobalShortcut(event) {
            if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (commandPaletteVisible) {
                    hideCommandPaletteModal();
                } else {
                    showCommandPaletteModal();
                }
                return;
            }

            if (event.key === 'Escape' && commandPaletteVisible) {
                hideCommandPaletteModal();
                return;
            }

            if (event.key === 'Escape' && jsonViewModal && jsonViewModal.style.display === 'block') {
                hideJsonViewerModal();
            }
        }

        function showCommandPaletteModal() {
            if (!commandPaletteModal) return;
            commandPaletteVisible = true;
            if (commandPaletteError) {
                commandPaletteError.textContent = '';
            }
            if (commandPaletteInput) {
                commandPaletteInput.value = '';
            }
            renderCommandPaletteResults();
            commandPaletteModal.style.display = 'block';
            if (commandPaletteInput) {
                setTimeout(() => commandPaletteInput.focus(), 0);
            }
        }

        function hideCommandPaletteModal() {
            if (!commandPaletteModal) return;
            commandPaletteVisible = false;
            commandPaletteModal.style.display = 'none';
            if (commandPaletteError) {
                commandPaletteError.textContent = '';
            }
        }

        function renderCommandPaletteResults() {
            if (!commandPaletteList) return;
            const query = commandPaletteInput ? commandPaletteInput.value : '';
            const commands = searchPaletteCommands(query, PALETTE_COMMANDS);

            commandPaletteList.innerHTML = '';
            if (commands.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.textContent = 'No commands found.';
                commandPaletteList.appendChild(emptyItem);
                return;
            }

            commands.forEach((command) => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.commandId = command.id;
                button.textContent = command.title;
                item.appendChild(button);
                commandPaletteList.appendChild(item);
            });
        }

        function handleCommandPaletteInputKeydown(event) {
            if (event.key !== 'Enter' || !commandPaletteList) return;
            event.preventDefault();
            const firstCommandButton = commandPaletteList.querySelector('button[data-command-id]');
            if (!firstCommandButton) return;
            executeCommandPaletteAction(firstCommandButton.dataset.commandId || '');
        }

        function handleCommandPaletteClick(event) {
            const commandButton = event.target.closest('button[data-command-id]');
            if (!commandButton) return;
            executeCommandPaletteAction(commandButton.dataset.commandId || '');
        }

        async function executeCommandPaletteAction(commandId) {
            if (!commandId) return;
            if (commandPaletteError) {
                commandPaletteError.textContent = '';
            }

            try {
                const route = routePaletteCommand(commandId, {
                    cookieScope: isCookieScope()
                });

                if (route.blocked) {
                    if (route.message) {
                        if (route.action === 'bulk-delete-filtered') {
                            showScopeGuardMessage();
                        } else if (commandPaletteError) {
                            commandPaletteError.textContent = route.message;
                        }
                    }
                    return;
                }

                switch (route.action) {
                    case 'add-cookie':
                        if (isCookieScope()) {
                            showAddCookieModal();
                        } else {
                            showAddStorageModal();
                        }
                        break;
                    case 'add-storage':
                        showAddStorageModal();
                        break;
                    case 'import-scope':
                        showImportModal('scope');
                        break;
                    case 'export-filtered':
                        handleExport('filtered');
                        break;
                    case 'bulk-delete-filtered':
                        if (!isCookieScope()) {
                            showScopeGuardMessage();
                            return;
                        }
                        handleBulkDelete('filtered');
                        break;
                    case 'restore-snapshot':
                        await handleRestoreSnapshot();
                        break;
                    case 'save-profile':
                        await handleSaveProfile();
                        break;
                    case 'compare-profile':
                        await showProfileDiffModal();
                        break;
                    case 'toggle-redaction':
                        toggleRedactionMode();
                        break;
                    default:
                        if (commandPaletteError) {
                            commandPaletteError.textContent = 'Unsupported command.';
                        }
                        return;
                }

                hideCommandPaletteModal();
            } catch (error) {
                console.error('Command execution failed:', error);
                if (commandPaletteError) {
                    commandPaletteError.textContent = error instanceof Error ? error.message : 'Command failed.';
                }
            }
        }

        function updateSearchPlaceholder() {
            if (!searchInput) return;
            if (!isCookieScope()) {
                searchInput.placeholder = `Search keys/values in ${activeScope}...`;
            } else if (activeTab === 'current') {
                searchInput.placeholder = `Search cookie names in ${currentDomain}...`;
            } else {
                searchInput.placeholder = 'Search all cookies (name, value, domain)...';
            }
        }

        function updateInfoBar() {
            if (!infoTitleElement || !cookieCountElement) return;
            if (!isCookieScope()) {
                const count = filteredStorageEntries.length;
                infoTitleElement.textContent = `${currentDomain || 'Current Tab'} · ${activeScope}`;
                cookieCountElement.textContent = `(${count} key${count !== 1 ? 's' : ''})`;
            } else if (activeTab === 'current') {
                const domainCookiesCount = filteredCookies.length;
                infoTitleElement.textContent = currentDomain || 'Current Tab';
                cookieCountElement.textContent = `(${domainCookiesCount} cookie${domainCookiesCount !== 1 ? 's' : ''})`;
            } else {
                const allFilteredCount = filteredCookies.length;
                infoTitleElement.textContent = 'All Domains';
                cookieCountElement.textContent = `(${allFilteredCount} cookie${allFilteredCount !== 1 ? 's' : ''})`;
            }
        }

        function handlePagination(type, direction) {
            if (!isCookieScope()) {
                if (type !== 'all') return;
                return;
            }

            const isCurrent = type === 'current';
            if (isCurrent) return;
            let currentPage = allDomainsCurrentPage;
            const items = sortCookies(filteredCookies);
            const totalPages = getTotalPages(items.length);

            currentPage += direction;

            if (currentPage >= 1 && currentPage <= totalPages) {
                allDomainsCurrentPage = currentPage;
                renderAllDomainsCookies();
            }
        }

        function updatePagination(type, currentPage, totalPages) {
            const info = document.getElementById(`${type}-page-info`);
            const prevBtn = document.getElementById(`${type}-prev-page`);
            const nextBtn = document.getElementById(`${type}-next-page`);

            if (!info || !prevBtn || !nextBtn) return;

            info.textContent = `Page ${currentPage} of ${totalPages}`;
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages || totalPages <= 1;

            const paginationContainerId = type === 'all' ? 'all-domains-pagination' : `${type}-domain-pagination`;
            const paginationContainer = document.getElementById(paginationContainerId);
            if (paginationContainer) {
                if (type === 'current') {
                    paginationContainer.style.display = 'none';
                    return;
                }
                paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
            }
        }

        function getTotalPages(itemCount) {
            return getTotalPagesUtil(itemCount, cookiesPerPage);
        }

        function sortCookies(cookiesToSort) {
            return sortCookiesByPinned(cookiesToSort, pinnedCookies);
        }

        function sortStorageEntriesWithPinned(entries) {
            return sortStorageEntriesByPinned(
                sortStorageEntries(entries),
                pinnedStorageEntries,
                (entry) => getStorageEntryPinKey(entry)
            );
        }

        function groupCookiesByDomain(cookiesToGroup) {
            return groupCookiesByDomainUtil(cookiesToGroup);
        }

        function togglePinCookie(cookie) {
            if (!cookie || !cookie.domain || !cookie.name) return;
            const key = getCookieStorageKey(cookie);
            if (pinnedCookies[key]) {
                delete pinnedCookies[key];
            } else {
                pinnedCookies[key] = true;
            }
            savePinnedCookies();
            filterAndRender();
        }

        function getStoragePinOrigin() {
            return storageOrigin || getCurrentTabOrigin() || currentDomain || 'unknown-origin';
        }

        function getStorageEntryPinKey(entry) {
            return `${activeScope}:${getStoragePinOrigin()}:${entry.key}`;
        }

        function togglePinStorageEntry(entry) {
            if (!entry || !entry.key) return;
            const key = getStorageEntryPinKey(entry);
            if (pinnedStorageEntries[key]) {
                delete pinnedStorageEntries[key];
            } else {
                pinnedStorageEntries[key] = true;
            }
            savePinnedStorageEntries();
            filterAndRender();
        }

        function loadPinnedCookies() {
            pinnedCookies = loadPinnedCookiesFromStorage('pinnedCookies');
            pinnedStorageEntries = loadPinnedCookiesFromStorage('pinnedStorageEntries');
        }

        function savePinnedCookies() {
            savePinnedCookiesToStorage(pinnedCookies, 'pinnedCookies');
        }

        function savePinnedStorageEntries() {
            savePinnedCookiesToStorage(pinnedStorageEntries, 'pinnedStorageEntries');
        }

        function copyToClipboard(text, message) {
            navigator.clipboard.writeText(text).then(() => {
                showCopiedMessage(message);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showCopiedMessage('Failed to copy!');
            });
        }

        function flashCopiedElement(element) {
            if (!element) return;
            element.classList.add('copy-flash');
            setTimeout(() => {
                element.classList.remove('copy-flash');
            }, 200);
        }

        function showCopiedMessage(message) {
            let msgElement = document.querySelector('.copied-message');
            if (!msgElement) {
                msgElement = document.createElement('div');
                msgElement.className = 'copied-message';
                // Append to body instead of container to ensure visibility over modal
                document.body.appendChild(msgElement);
            }

            msgElement.textContent = message;
            msgElement.classList.add('show');

            if (msgElement.timeoutId) {
                clearTimeout(msgElement.timeoutId);
            }

            msgElement.timeoutId = setTimeout(() => {
                if (msgElement) { // Check if element still exists
                    msgElement.classList.remove('show');
                    // Optionally remove the element after fade out
                    // setTimeout(() => { if(msgElement.parentNode) msgElement.parentNode.removeChild(msgElement); }, 300);
                }
                msgElement.timeoutId = null;
            }, 2500); // Slightly longer duration
        }

        function escapeHtml(text) {
            if (typeof text !== 'string') return String(text); // Ensure it's a string
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // --- Feature 2 Helper Functions ---
        function deriveUrl(cookie) {
            return deriveCookieUrl(cookie);
        }

        function getCurrentTabOrigin() {
            if (currentTabUrl) {
                try {
                    return new URL(currentTabUrl).origin;
                } catch (error) {
                    console.warn('Unable to derive origin from tab URL:', currentTabUrl, error);
                }
            }

            return currentDomain || 'unknown-origin';
        }

        function parseDateToUnixSeconds(dateString) {
            return parseDateToUnixSecondsUtil(dateString);
        }

        function loadSavedProfilesSorted() {
            return loadProfileRecords(localStorage).sort((a, b) => {
                const dateA = new Date(a.updatedAt).getTime();
                const dateB = new Date(b.updatedAt).getTime();
                return dateB - dateA;
            });
        }

        async function collectCurrentProfileState() {
            const profileState = {
                cookies: [...allCookiesMaster],
                localStorageEntries: [],
                sessionStorageEntries: []
            };

            if (!currentTabId || !canEditCurrentDomain(currentDomain)) {
                return profileState;
            }

            try {
                await ensureStorageBridgeReady(currentTabId);
                const [localData, sessionData] = await Promise.all([
                    getStorageEntries(currentTabId, STORAGE_AREA.LOCAL),
                    getStorageEntries(currentTabId, STORAGE_AREA.SESSION)
                ]);
                profileState.localStorageEntries = normalizeStorageEntries(localData);
                profileState.sessionStorageEntries = normalizeStorageEntries(sessionData);
            } catch (error) {
                console.warn('Storage state unavailable for profile capture:', error);
            }

            return profileState;
        }

        async function handleSaveProfile() {
            if (profilesDropdown) {
                profilesDropdown.removeAttribute('open');
            }

            const profileNameInput = prompt('Enter a profile name:');
            if (profileNameInput === null) return;

            const profileName = profileNameInput.trim();
            if (!profileName) {
                showCopiedMessage('Profile name is required.');
                return;
            }

            const existingProfile = loadSavedProfilesSorted().find((profile) =>
                profile.name.toLowerCase() === profileName.toLowerCase()
            );
            if (existingProfile) {
                const shouldOverwrite = confirm(`Profile "${existingProfile.name}" already exists. Update it?`);
                if (!shouldOverwrite) return;
            }

            const currentState = await collectCurrentProfileState();
            const record = createProfileRecord({
                id: existingProfile ? existingProfile.id : undefined,
                name: profileName,
                cookies: currentState.cookies,
                localStorageEntries: currentState.localStorageEntries,
                sessionStorageEntries: currentState.sessionStorageEntries,
                createdAt: existingProfile ? existingProfile.createdAt : undefined
            });

            upsertProfileRecord(localStorage, record);
            showCopiedMessage(`Profile "${record.name}" saved.`);
        }

        function handleExportProfile() {
            if (profilesDropdown) {
                profilesDropdown.removeAttribute('open');
            }

            const profiles = loadSavedProfilesSorted();
            if (profiles.length === 0) {
                showCopiedMessage('No saved profiles found.');
                return;
            }

            const selectedProfile = selectProfileByPrompt(profiles, 'Enter profile name to export:');
            if (!selectedProfile) return;

            const payload = createProfileExportPayload(selectedProfile);
            copyToClipboard(
                JSON.stringify(payload, null, 2),
                `Profile "${selectedProfile.name}" copied to clipboard as JSON.`
            );
        }

        function showProfileImportModal() {
            if (profilesDropdown) {
                profilesDropdown.removeAttribute('open');
            }
            showImportModal('profile');
        }

        function selectProfileByPrompt(profiles, promptMessage) {
            if (profiles.length === 1) {
                return profiles[0];
            }

            const profileNames = profiles.map((profile) => profile.name).join('\n- ');
            const enteredName = prompt(`${promptMessage}\n- ${profileNames}`);
            if (enteredName === null) return null;

            const normalizedName = enteredName.trim().toLowerCase();
            if (!normalizedName) {
                showCopiedMessage('Profile name is required.');
                return null;
            }

            const match = profiles.find((profile) => profile.name.toLowerCase() === normalizedName);
            if (!match) {
                showCopiedMessage('Profile not found.');
                return null;
            }

            return match;
        }

        async function showProfileDiffModal() {
            if (profilesDropdown) {
                profilesDropdown.removeAttribute('open');
            }

            const profiles = loadSavedProfilesSorted();
            if (profiles.length === 0) {
                showCopiedMessage('No saved profiles found. Save a profile first.');
                return;
            }

            if (!profileDiffModal || !profileSelect) {
                showCopiedMessage('Profile modal is unavailable.');
                return;
            }

            if (profileDiffError) {
                profileDiffError.textContent = '';
            }
            if (profileDiffSummary) {
                profileDiffSummary.textContent = 'Calculating current state...';
            }
            if (profileDiffList) {
                profileDiffList.innerHTML = '';
            }

            profileDiffCurrentState = await collectCurrentProfileState();
            populateProfileSelect(profiles);
            renderSelectedProfileDiff();
            profileDiffModal.style.display = 'block';
        }

        function hideProfileDiffModal() {
            if (!profileDiffModal) return;
            profileDiffModal.style.display = 'none';
            profileDiffCurrentState = null;
            if (profileDiffSummary) {
                profileDiffSummary.textContent = '';
            }
            if (profileDiffList) {
                profileDiffList.innerHTML = '';
            }
            if (profileDiffError) {
                profileDiffError.textContent = '';
            }
        }

        function populateProfileSelect(profiles) {
            if (!profileSelect) return;
            profileSelect.innerHTML = '';

            profiles.forEach((profile) => {
                const option = document.createElement('option');
                option.value = profile.id;
                const updatedLabel = new Date(profile.updatedAt).toLocaleString();
                option.textContent = `${profile.name} (${updatedLabel})`;
                profileSelect.appendChild(option);
            });
        }

        function renderSelectedProfileDiff() {
            if (!profileSelect || !profileDiffCurrentState || !profileDiffSummary || !profileDiffList) return;

            const selectedId = profileSelect.value;
            const selectedProfile = loadSavedProfilesSorted().find((profile) => profile.id === selectedId);
            if (!selectedProfile) {
                if (profileDiffError) {
                    profileDiffError.textContent = 'Selected profile could not be loaded.';
                }
                return;
            }

            if (profileDiffError) {
                profileDiffError.textContent = '';
            }

            const diff = diffProfileState(selectedProfile, profileDiffCurrentState);
            profileDiffSummary.textContent =
                `Added: ${diff.summary.added} | Removed: ${diff.summary.removed} | Changed: ${diff.summary.changed}`;

            const lines = [];
            lines.push(...formatDiffLines('Cookies', diff.cookies));
            lines.push(...formatDiffLines('localStorage', diff.localStorage));
            lines.push(...formatDiffLines('sessionStorage', diff.sessionStorage));
            if (lines.length === 0) {
                lines.push('No differences detected.');
            }

            profileDiffList.innerHTML = '';
            lines.slice(0, 40).forEach((line) => {
                const item = document.createElement('li');
                item.textContent = line;
                profileDiffList.appendChild(item);
            });
        }

        function formatDiffLines(label, diffSection) {
            const lines = [];
            if (diffSection.added.length > 0) {
                diffSection.added.slice(0, 5).forEach((key) => {
                    lines.push(`${label} + ${key}`);
                });
            }
            if (diffSection.removed.length > 0) {
                diffSection.removed.slice(0, 5).forEach((key) => {
                    lines.push(`${label} - ${key}`);
                });
            }
            if (diffSection.changed.length > 0) {
                diffSection.changed.slice(0, 5).forEach((entry) => {
                    lines.push(`${label} ~ ${entry.key}`);
                });
            }
            return lines;
        }

        // --- Feature 3 Storage Modal Functions ---
        function showStorageModal() {
            if (!storageEditModal || !storageFormError) return;
            storageFormError.textContent = '';
            storageEditModal.style.display = 'block';
        }

        function hideStorageModal() {
            if (!storageEditModal || !storageForm || !storageFormOriginalKey || !storageFormError) return;
            storageEditModal.style.display = 'none';
            storageForm.reset();
            storageFormOriginalKey.value = '';
            storageFormError.textContent = '';
        }

        function showAddStorageModal() {
            if (!storageModalTitle || !storageForm || !storageFormOriginalKey || !storageFormKey || !storageFormValue) return;

            if (!canMutateStorageScope()) {
                showCopiedMessage('Storage is unavailable for this page.');
                return;
            }

            storageModalTitle.textContent = 'Add Storage Key';
            storageForm.reset();
            storageFormOriginalKey.value = '';
            storageFormKey.value = '';
            storageFormValue.value = '';
            showStorageModal();
        }

        function showEditStorageModal(entry) {
            if (!entry || typeof entry.key !== 'string') return;
            if (!storageModalTitle || !storageFormOriginalKey || !storageFormKey || !storageFormValue) return;

            if (!canMutateStorageScope()) {
                showCopiedMessage('Storage is unavailable for this page.');
                return;
            }

            storageModalTitle.textContent = 'Edit Storage Key';
            storageFormOriginalKey.value = entry.key;
            storageFormKey.value = entry.key;
            storageFormValue.value = typeof entry.value === 'string' ? entry.value : String(entry.value ?? '');
            showStorageModal();
        }

        async function handleSaveStorageEntry(event) {
            event.preventDefault();

            if (!storageFormError || !storageFormOriginalKey || !storageFormKey || !storageFormValue) return;
            storageFormError.textContent = '';

            if (!canMutateStorageScope()) {
                storageFormError.textContent = 'Storage is unavailable for this page.';
                return;
            }

            let normalizedInput;
            try {
                normalizedInput = normalizeStorageMutationInput({
                    originalKey: storageFormOriginalKey.value,
                    key: storageFormKey.value,
                    value: storageFormValue.value
                });
            } catch (error) {
                storageFormError.textContent = error instanceof Error ? error.message : 'Invalid storage input.';
                return;
            }

            const storageArea = getStorageAreaForScope();
            const operationPlan = planStorageMutation(normalizedInput);
            const tabId = currentTabId;
            if (tabId === null) {
                storageFormError.textContent = 'Storage is unavailable for this page.';
                return;
            }

            try {
                await ensureStorageBridgeReady(tabId);

                const priorKey = normalizedInput.originalKey || '';
                const nextPinKey = getStorageEntryPinKey({ key: normalizedInput.key, value: normalizedInput.value });
                const priorPinKey = priorKey
                    ? getStorageEntryPinKey({ key: priorKey, value: normalizedInput.value })
                    : '';
                const carriedPinnedState = priorPinKey ? Boolean(pinnedStorageEntries[priorPinKey]) : false;

                for (const operation of operationPlan) {
                    if (operation.type === 'remove') {
                        await removeStorageEntry(tabId, storageArea, operation.key);
                    } else {
                        await setStorageEntry(tabId, storageArea, operation.key, operation.value);
                    }
                }

                if (priorPinKey && priorPinKey !== nextPinKey && pinnedStorageEntries[priorPinKey]) {
                    delete pinnedStorageEntries[priorPinKey];
                    if (carriedPinnedState) {
                        pinnedStorageEntries[nextPinKey] = true;
                    }
                    savePinnedStorageEntries();
                }

                hideStorageModal();
                showCopiedMessage(`Storage key "${normalizedInput.key}" saved.`);
                await fetchStorageEntries();
            } catch (error) {
                console.error('Failed to save storage entry:', error);
                storageFormError.textContent = error instanceof Error ? error.message : 'Failed to save storage key.';
            }
        }

        async function handleDeleteStorageEntry(entry) {
            if (!entry || typeof entry.key !== 'string' || !entry.key) {
                return;
            }

            if (!canMutateStorageScope()) {
                showCopiedMessage('Storage is unavailable for this page.');
                return;
            }

            const confirmation = confirm(
                `Are you sure you want to delete the storage key "${entry.key}" from ${activeScope}?`
            );
            if (!confirmation) return;

            try {
                const tabId = currentTabId;
                if (tabId === null) {
                    showCopiedMessage('Storage is unavailable for this page.');
                    return;
                }
                const storageArea = getStorageAreaForScope();
                await ensureStorageBridgeReady(tabId);
                await removeStorageEntry(tabId, storageArea, entry.key);
                const pinKey = getStorageEntryPinKey(entry);
                if (pinnedStorageEntries[pinKey]) {
                    delete pinnedStorageEntries[pinKey];
                    savePinnedStorageEntries();
                }
                showCopiedMessage(`Storage key "${entry.key}" deleted.`);
                await fetchStorageEntries();
            } catch (error) {
                console.error('Failed to delete storage entry:', error);
                showCopiedMessage(error instanceof Error ? error.message : 'Failed to delete storage key.');
            }
        }

        // --- Feature 2 Cookie Modal Functions ---
        function showCookieModal() {
            if (!cookieEditModal || !cookieFormError) return;
            cookieFormError.textContent = '';
            cookieEditModal.style.display = 'block';
        }

        function hideCookieModal() {
            if (!cookieEditModal || !cookieForm) return;
            cookieEditModal.style.display = 'none';
            cookieForm.reset();
            cookieFormStoreId.value = '';
        }

        function showEditCookieModal(cookie) {
            if (!cookieModalTitle || !cookieForm || !cookieFormName || !cookieFormValue || !cookieFormDomain || !cookieFormPath || !cookieFormExpirationDate || !cookieFormSecure || !cookieFormHttpOnly || !cookieFormSameSite || !cookieFormStoreId) return; // Safety check

            cookieModalTitle.textContent = 'Edit Cookie';
            cookieFormStoreId.value = cookie.storeId || '';

            cookieFormName.value = cookie.name;
            cookieFormValue.value = cookie.value;
            cookieFormDomain.value = cookie.domain || '';
            cookieFormPath.value = cookie.path || '/';
            cookieFormSecure.checked = cookie.secure || false;
            cookieFormHttpOnly.checked = cookie.httpOnly || false;
            cookieFormSameSite.value = cookie.sameSite || 'lax';

            if (cookie.expirationDate) {
                try {
                    const date = new Date(cookie.expirationDate * 1000);
                    if (isNaN(date.getTime())) throw new Error("Invalid date from timestamp");
                    // Format YYYY-MM-DDTHH:mm for datetime-local
                    const offset = date.getTimezoneOffset() * 60000; // Offset in milliseconds
                    const localDate = new Date(date.getTime() - offset);
                    cookieFormExpirationDate.value = localDate.toISOString().slice(0, 16);
                } catch (e) {
                    console.error("Error formatting expiration date:", cookie.expirationDate, e);
                    cookieFormExpirationDate.value = '';
                }
            } else {
                cookieFormExpirationDate.value = '';
            }

            showCookieModal();
        }

        function showAddCookieModal() {
            if (!cookieModalTitle || !cookieForm || !cookieFormDomain || !cookieFormPath || !cookieFormSameSite || !cookieFormSecure || !cookieFormStoreId) return; // Safety check

            cookieModalTitle.textContent = 'Add New Cookie';
            cookieForm.reset();
            cookieFormStoreId.value = '';
            if (canEditCurrentDomain(currentDomain)) {
                cookieFormDomain.value = suggestDomainForCookie(currentDomain); // Suggest leading dot
                cookieFormPath.value = '/';
            } else {
                cookieFormDomain.value = '';
                cookieFormPath.value = '/';
            }
            cookieFormSameSite.value = 'lax';
            cookieFormSecure.checked = currentTabUrl.startsWith('https');
            showCookieModal();
        }

        async function handleSaveCookie(event) {
            event.preventDefault();
            if (!cookieFormError || !cookieFormName || !cookieFormValue || !cookieFormDomain || !cookieFormPath || !cookieFormExpirationDate || !cookieFormSecure || !cookieFormHttpOnly || !cookieFormSameSite || !cookieFormStoreId) return; // Safety check

            cookieFormError.textContent = '';

            const cookieDetails = {
                name: cookieFormName.value.trim(),
                value: cookieFormValue.value,
                domain: cookieFormDomain.value.trim() || undefined,
                path: cookieFormPath.value.trim() || '/',
                secure: cookieFormSecure.checked,
                httpOnly: cookieFormHttpOnly.checked,
                sameSite: cookieFormSameSite.value,
                storeId: cookieFormStoreId.value || undefined
            };

            if (!cookieDetails.name) {
                cookieFormError.textContent = 'Cookie name is required.';
                return;
            }
            if (!cookieDetails.domain) {
                if (canEditCurrentDomain(currentDomain)) {
                    cookieDetails.domain = suggestDomainForCookie(currentDomain);
                    cookieFormDomain.value = cookieDetails.domain;
                } else {
                    cookieFormError.textContent = 'Cookie domain is required.';
                    return;
                }
            }

            const expirationTimestamp = parseDateToUnixSeconds(cookieFormExpirationDate.value);
            if (expirationTimestamp === 'invalid') {
                cookieFormError.textContent = 'Invalid expiration date format.';
                return;
            }
            if (expirationTimestamp !== null) {
                // Add check: Expiration date must be in the future
                if (expirationTimestamp * 1000 <= Date.now()) {
                    cookieFormError.textContent = 'Expiration date must be in the future.';
                    return;
                }
                cookieDetails.expirationDate = expirationTimestamp;
            }

            try {
                cookieDetails.url = deriveUrl({
                    domain: cookieDetails.domain,
                    path: cookieDetails.path,
                    secure: cookieDetails.secure
                });
            } catch (e) {
                cookieFormError.textContent = `Error deriving URL: ${e.message}`;
                return;
            }

            console.log("Setting cookie with details:", cookieDetails);

            try {
                const setCookie = await chrome.cookies.set(cookieDetails);
                if (setCookie === null) {
                    console.error("chrome.cookies.set returned null. Details:", cookieDetails);
                    const error = chrome.runtime.lastError;
                    cookieFormError.textContent = `Failed to set cookie. ${error ? error.message : 'Check domain/path/flags validity.'}`;
                } else {
                    console.log("Cookie set successfully:", setCookie);
                    hideCookieModal();
                    showCopiedMessage(`Cookie "${setCookie.name}" saved successfully!`);
                    await fetchCookies();
                }
            } catch (error) {
                console.error("Error setting cookie:", error, cookieDetails);
                const lastError = chrome.runtime.lastError;
                cookieFormError.textContent = `Error: ${error.message || (lastError ? lastError.message : 'Unknown error')}`;
            }
        }

        // --- Feature 2 Cookie CRUD Functions ---
        async function handleDeleteCookie(cookie) {
            if (!cookie || !cookie.name || !cookie.domain) {
                console.error("Invalid cookie object passed to handleDeleteCookie", cookie);
                return;
            }

            const confirmation = confirm(`Are you sure you want to delete the cookie "${cookie.name}" from domain "${cookie.domain}"?`);
            if (!confirmation) return;

            try {
                const url = deriveUrl(cookie);
                console.log(`Removing cookie: Name=${cookie.name}, URL=${url}, StoreID=${cookie.storeId}`);
                const removedDetails = await chrome.cookies.remove({
                    url: url,
                    name: cookie.name,
                    storeId: cookie.storeId
                });

                if (removedDetails === null) {
                    console.error("chrome.cookies.remove returned null.", cookie, chrome.runtime.lastError);
                    showCopiedMessage(`Failed to remove cookie. ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Maybe it was already deleted?'}`);
                } else {
                    console.log("Cookie removed successfully:", removedDetails);
                    showCopiedMessage(`Cookie "${removedDetails.name}" deleted.`);
                    const key = getCookieStorageKey(cookie);
                    if (pinnedCookies[key]) {
                        delete pinnedCookies[key];
                        savePinnedCookies();
                    }
                    await fetchCookies();
                }
            } catch (error) {
                console.error("Error removing cookie:", error, cookie, chrome.runtime.lastError);
                showCopiedMessage(`Error deleting cookie: ${error.message || (chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error')}`);
            }
        }

        function handleBulkDelete(type) {
            let plan;
            try {
                plan = createBulkDeletePlan({
                    type,
                    cookies: filteredCookies,
                    pinnedCookies
                });
            } catch (error) {
                console.error('Failed to build bulk delete plan:', error);
                showCopiedMessage('Unable to prepare bulk delete preview.');
                return;
            }

            if (plan.targetCount === 0) {
                showCopiedMessage('No cookies match the criteria for deletion.');
                return;
            }

            pendingBulkDeletePlan = plan;
            showBulkDeleteModal(plan);
        }

        function showBulkDeleteModal(plan) {
            if (!bulkDeleteModal) return;
            pendingBulkDeletePhrase = createBulkDeleteConfirmationPhrase(plan);

            if (bulkDeleteModalTitle) {
                bulkDeleteModalTitle.textContent = plan.title;
            }
            if (bulkDeleteSummary) {
                bulkDeleteSummary.textContent = `This operation will delete ${plan.targetCount} cookie${plan.targetCount !== 1 ? 's' : ''}.`;
            }
            if (bulkDeletePreviewMeta) {
                const detailParts = [
                    `Filtered: ${plan.totalFiltered}`,
                    `To delete: ${plan.targetCount}`,
                    `Session cookies in delete set: ${plan.sessionTargetCount}`
                ];
                if (plan.type === BULK_DELETE_TYPE.NON_PINNED) {
                    detailParts.push(`Pinned skipped: ${plan.pinnedSkippedCount}`);
                }
                bulkDeletePreviewMeta.textContent = detailParts.join(' | ');
            }
            if (bulkDeleteError) {
                bulkDeleteError.textContent = '';
            }
            if (confirmBulkDeleteModalBtn) {
                confirmBulkDeleteModalBtn.textContent = 'Delete Cookies';
            }
            if (bulkDeleteConfirmationPhrase) {
                bulkDeleteConfirmationPhrase.textContent = `Type "${pendingBulkDeletePhrase}" to confirm:`;
            }
            if (bulkDeleteConfirmInput) {
                bulkDeleteConfirmInput.value = '';
                bulkDeleteConfirmInput.disabled = false;
            }
            if (bulkDeletePreviewList) {
                bulkDeletePreviewList.innerHTML = '';
                plan.previewItems.forEach((item) => {
                    const previewRow = document.createElement('li');
                    const flags = [];
                    if (item.isSession) flags.push('Session');
                    if (item.isPinned) flags.push('Pinned');
                    const flagsSuffix = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
                    previewRow.textContent = `${item.name} @ ${item.domain}${flagsSuffix}`;
                    bulkDeletePreviewList.appendChild(previewRow);
                });

                const hiddenCount = plan.targetCount - plan.previewItems.length;
                if (hiddenCount > 0) {
                    const hiddenRow = document.createElement('li');
                    hiddenRow.textContent = `...and ${hiddenCount} more`;
                    bulkDeletePreviewList.appendChild(hiddenRow);
                }
            }

            bulkDeleteModal.style.display = 'block';
            updateBulkDeleteConfirmState();
        }

        function hideBulkDeleteModal() {
            if (!bulkDeleteModal) return;
            bulkDeleteModal.style.display = 'none';
            pendingBulkDeletePlan = null;
            pendingBulkDeletePhrase = '';
            if (bulkDeleteConfirmInput) {
                bulkDeleteConfirmInput.value = '';
                bulkDeleteConfirmInput.disabled = false;
            }
            if (bulkDeleteError) {
                bulkDeleteError.textContent = '';
            }
        }

        function getLastDeleteSnapshot() {
            return loadDeleteSnapshot(localStorage);
        }

        function hasDeleteSnapshotAvailable() {
            return Boolean(getLastDeleteSnapshot());
        }

        function captureDeleteSnapshot(cookiesToDelete) {
            try {
                const reason = pendingBulkDeletePlan ? pendingBulkDeletePlan.type : BULK_DELETE_TYPE.FILTERED;
                const snapshot = createDeleteSnapshot(cookiesToDelete, reason);
                saveDeleteSnapshot(localStorage, snapshot);
                updateScopeUiState();
            } catch (error) {
                console.error('Failed to capture delete snapshot:', error);
            }
        }

        function updateBulkDeleteConfirmState() {
            if (!confirmBulkDeleteModalBtn) return;
            const inputValue = bulkDeleteConfirmInput ? bulkDeleteConfirmInput.value : '';
            const canConfirm =
                Boolean(pendingBulkDeletePhrase) &&
                isBulkDeleteConfirmationValid(inputValue, pendingBulkDeletePhrase);
            confirmBulkDeleteModalBtn.disabled = !canConfirm;
        }

        async function confirmBulkDeleteFromModal() {
            if (!pendingBulkDeletePlan) {
                hideBulkDeleteModal();
                return;
            }

            if (!isBulkDeleteConfirmationValid(
                bulkDeleteConfirmInput ? bulkDeleteConfirmInput.value : '',
                pendingBulkDeletePhrase
            )) {
                if (bulkDeleteError) {
                    bulkDeleteError.textContent = `Type "${pendingBulkDeletePhrase}" to confirm deletion.`;
                }
                updateBulkDeleteConfirmState();
                return;
            }

            if (confirmBulkDeleteModalBtn) {
                confirmBulkDeleteModalBtn.disabled = true;
                confirmBulkDeleteModalBtn.textContent = 'Deleting...';
            }
            if (bulkDeleteConfirmInput) {
                bulkDeleteConfirmInput.disabled = true;
            }

            const planToExecute = pendingBulkDeletePlan;
            try {
                await executeBulkDelete(planToExecute.targetCookies);
                hideBulkDeleteModal();
            } catch (error) {
                console.error('Bulk delete execution failed:', error);
                if (bulkDeleteError) {
                    bulkDeleteError.textContent = error instanceof Error ? error.message : 'Failed to delete cookies.';
                }
                if (bulkDeleteConfirmInput) {
                    bulkDeleteConfirmInput.disabled = false;
                }
                if (confirmBulkDeleteModalBtn) {
                    confirmBulkDeleteModalBtn.textContent = 'Delete Cookies';
                }
                updateBulkDeleteConfirmState();
            }
        }

        async function executeBulkDelete(cookiesToDelete) {
            captureDeleteSnapshot(cookiesToDelete);
            showCopiedMessage(`Deleting ${cookiesToDelete.length} cookies...`);

            let successCount = 0;
            let failCount = 0;
            let pinnedChanged = false;

            const promises = cookiesToDelete.map(cookie =>
                chrome.cookies.remove({
                    url: deriveUrl(cookie),
                    name: cookie.name,
                    storeId: cookie.storeId
                }).then(details => {
                    if (details !== null) {
                        successCount++;
                        const key = getCookieStorageKey(cookie);
                        if (pinnedCookies[key]) {
                            delete pinnedCookies[key];
                            pinnedChanged = true;
                        }
                    } else {
                        failCount++;
                        console.warn("Failed to remove cookie (returned null):", cookie, chrome.runtime.lastError);
                    }
                }).catch(error => {
                    failCount++;
                    console.error("Error removing cookie during bulk delete:", error, cookie, chrome.runtime.lastError);
                })
            );

            await Promise.allSettled(promises);

            if (failCount > 0) {
                showCopiedMessage(`Bulk delete finished: ${successCount} succeeded, ${failCount} failed.`);
            } else {
                showCopiedMessage(`Bulk delete finished: ${successCount} cookies deleted.`);
            }

            if (pinnedChanged) {
                savePinnedCookies();
            }

            await fetchCookies();
        }

        async function handleRestoreSnapshot() {
            if (!isCookieScope()) {
                showScopeGuardMessage();
                return;
            }

            const snapshot = getLastDeleteSnapshot();
            if (!snapshot) {
                showCopiedMessage('No delete snapshot found.');
                updateScopeUiState();
                return;
            }

            const createdAt = new Date(snapshot.createdAt);
            const createdAtLabel = Number.isNaN(createdAt.getTime())
                ? snapshot.createdAt
                : createdAt.toLocaleString();

            const restorePlan = buildRestoreCookieSetOperations(snapshot);
            if (restorePlan.operations.length === 0) {
                showCopiedMessage('Snapshot has no restorable cookies.');
                return;
            }

            const confirmation = confirm(
                `Restore ${restorePlan.operations.length} cookie${restorePlan.operations.length !== 1 ? 's' : ''} from snapshot (${createdAtLabel})?`
            );
            if (!confirmation) return;

            showCopiedMessage(`Restoring ${restorePlan.operations.length} cookies...`);

            let successCount = 0;
            let failCount = 0;
            const promises = restorePlan.operations.map((cookieDetails) =>
                chrome.cookies.set(cookieDetails)
                    .then((setCookie) => {
                        if (setCookie === null) {
                            failCount += 1;
                            console.warn('Failed to restore cookie (set returned null):', cookieDetails, chrome.runtime.lastError);
                        } else {
                            successCount += 1;
                        }
                    })
                    .catch((error) => {
                        failCount += 1;
                        console.error('Error restoring cookie from snapshot:', error, cookieDetails, chrome.runtime.lastError);
                    })
            );

            await Promise.allSettled(promises);

            const totalFail = failCount + restorePlan.skippedCount;
            if (totalFail > 0) {
                showCopiedMessage(`Restore finished: ${successCount} succeeded, ${totalFail} failed/skipped.`);
            } else {
                showCopiedMessage(`Restore finished: ${successCount} cookies restored.`);
            }

            await fetchCookies();
        }

        // --- Feature 2 Import/Export Functions ---
        function handleExport(type) {
            if (isCookieScope()) {
                handleCookieExport(type);
                return;
            }

            handleStorageExport(type);
        }

        function handleCookieExport(type) {
            let cookiesToExport = [];

            switch (type) {
                case 'all':
                    cookiesToExport = [...allCookiesMaster];
                    break;
                case 'filtered':
                    cookiesToExport = [...filteredCookies];
                    break;
                case 'domain':
                    cookiesToExport = allCookiesMaster.filter(cookie =>
                        isCookieInCurrentDomain(cookie, currentDomain)
                    );
                    break;
                default: return;
            }

            if (cookiesToExport.length === 0) {
                showCopiedMessage("No cookies to export for this selection.");
                return;
            }

            const exportData = mapCookiesForExport(cookiesToExport);

            const jsonString = JSON.stringify(exportData, null, 2);
            copyToClipboard(jsonString, `${cookiesToExport.length} cookies copied to clipboard as JSON.`);
        }

        function handleStorageExport(type) {
            let entriesToExport = [];

            switch (type) {
                case 'all':
                case 'domain':
                    entriesToExport = [...storageEntriesMaster];
                    break;
                case 'filtered':
                    entriesToExport = [...filteredStorageEntries];
                    break;
                default: return;
            }

            if (entriesToExport.length === 0) {
                showCopiedMessage('No storage keys to export for this selection.');
                return;
            }

            const storageArea = getStorageAreaForScope();
            const payload = createStorageExportPayload(entriesToExport, {
                storageArea,
                origin: storageOrigin || getCurrentTabOrigin()
            });

            const jsonString = JSON.stringify(payload, null, 2);
            const keyLabel = entriesToExport.length === 1 ? 'key' : 'keys';
            copyToClipboard(jsonString, `${entriesToExport.length} storage ${keyLabel} copied to clipboard as JSON.`);
        }

        function getImportModalConfig(mode = 'scope') {
            if (mode === 'profile') {
                return {
                    title: 'Import Profile',
                    description: 'Paste profile export JSON below:',
                    confirmLabel: 'Import Profile',
                    placeholder: '{"kind":"cookie-snatcher-profile-export","version":2,"profile":{...}}'
                };
            }

            if (isCookieScope()) {
                return {
                    title: 'Import Cookies',
                    description: 'Paste JSON array of cookie objects below:',
                    confirmLabel: 'Import Cookies',
                    placeholder: '[{"name": "myCookie", "value": "myValue", "domain": ".example.com", ...}]'
                };
            }

            return {
                title: `Import ${activeScope}`,
                description: 'Paste a JSON array of storage entries or a storage export payload:',
                confirmLabel: 'Import Keys',
                placeholder: '{"kind":"cookie-snatcher-storage-export","storageArea":"localStorage","entries":[{"key":"theme","value":"dark"}]}'
            };
        }

        function showImportModal(mode = 'scope') {
            if (!importModal || !importJsonArea || !importError || !importConfirmBtn) return;
            activeImportMode = mode;
            const config = getImportModalConfig(mode);

            if (importModalTitle) {
                importModalTitle.textContent = config.title;
            }
            if (importModalDescription) {
                importModalDescription.textContent = config.description;
            }
            importConfirmBtn.textContent = config.confirmLabel;
            importJsonArea.placeholder = config.placeholder;
            importJsonArea.value = '';
            importError.textContent = '';
            importModal.style.display = 'block';
        }

        function hideImportModal() {
            if (!importModal) return;
            importModal.style.display = 'none';
            activeImportMode = 'scope';
        }

        async function handleImport() {
            if (!importJsonArea || !importError) return;
            const jsonString = importJsonArea.value.trim();
            importError.textContent = '';

            if (!jsonString) {
                importError.textContent = 'Please paste JSON data.';
                return;
            }

            let parsedInput;
            try {
                parsedInput = JSON.parse(jsonString);
            } catch (error) {
                console.error('Error parsing import JSON:', error);
                importError.textContent = `Invalid JSON: ${error instanceof Error ? error.message : 'Unable to parse JSON.'}`;
                return;
            }

            if (activeImportMode === 'profile') {
                await handleProfileImport(parsedInput);
                return;
            }

            if (isCookieScope()) {
                await handleCookieImport(parsedInput);
                return;
            }

            await handleStorageImport(parsedInput);
        }

        async function handleCookieImport(parsedInput) {
            if (!importError) return;

            let importPlan;
            try {
                importPlan = createCookieImportPlan(parsedInput);
            } catch (error) {
                importError.textContent = error instanceof Error ? error.message : 'Invalid cookie import payload.';
                return;
            }

            if (importPlan.total === 0) {
                showCopiedMessage("No cookies found in the provided JSON.");
                hideImportModal();
                return;
            }

            const confirmation = confirm(`You are about to import ${importPlan.total} cookies. This might overwrite existing cookies. Continue?`);
            if (!confirmation) return;

            showCopiedMessage(`Importing ${importPlan.total} cookies...`);
            hideImportModal();

            let successCount = 0;
            let failCount = importPlan.invalidCount;

            const promises = importPlan.validEntries.map(cookieDetails => {
                let detailsWithUrl;

                try {
                    detailsWithUrl = {
                        ...cookieDetails,
                        url: deriveUrl(cookieDetails)
                    };
                } catch (error) {
                    console.warn("Skipping cookie due to URL derivation error:", error.message, cookieDetails);
                    failCount++;
                    return Promise.resolve();
                }

                return chrome.cookies.set(detailsWithUrl)
                    .then(setCookie => {
                        if (setCookie === null) {
                            failCount++;
                            console.warn("Failed to import cookie (set returned null):", cookieDetails, chrome.runtime.lastError);
                        } else {
                            successCount++;
                        }
                    })
                    .catch(error => {
                        failCount++;
                        console.error("Error importing cookie:", error, cookieDetails, chrome.runtime.lastError);
                    });
            });

            await Promise.allSettled(promises);

            if (failCount > 0) {
                showCopiedMessage(`Import finished: ${successCount} succeeded, ${failCount} failed.`);
            } else {
                showCopiedMessage(`Import finished: ${successCount} cookies imported successfully.`);
            }

            await fetchCookies();
        }

        async function handleStorageImport(parsedInput) {
            if (!importError) return;

            if (!canMutateStorageScope()) {
                importError.textContent = 'Storage is unavailable for this page.';
                return;
            }

            let entriesToImport = [];
            try {
                entriesToImport = parseStorageImportPayload(parsedInput);
            } catch (error) {
                importError.textContent = error instanceof Error ? error.message : 'Invalid storage import payload.';
                return;
            }

            const storageArea = getStorageAreaForScope();
            const importStorageArea = parseStorageAreaFromImportPayload(parsedInput);
            if (importStorageArea && importStorageArea !== storageArea) {
                const shouldContinue = confirm(
                    `This payload targets ${importStorageArea}, but current scope is ${storageArea}. Import into ${storageArea} anyway?`
                );
                if (!shouldContinue) {
                    return;
                }
            }

            const confirmation = confirm(
                `You are about to import ${entriesToImport.length} storage keys into ${storageArea}. Continue?`
            );
            if (!confirmation) return;

            const tabId = currentTabId;
            if (tabId === null) {
                importError.textContent = 'Storage is unavailable for this page.';
                return;
            }

            showCopiedMessage(`Importing ${entriesToImport.length} storage keys...`);
            hideImportModal();

            let successCount = 0;
            let failCount = 0;

            try {
                await ensureStorageBridgeReady(tabId);
            } catch (error) {
                importError.textContent = error instanceof Error ? error.message : 'Unable to connect to page storage.';
                return;
            }

            const promises = entriesToImport.map((entry) =>
                setStorageEntry(tabId, storageArea, entry.key, entry.value)
                    .then(() => {
                        successCount += 1;
                    })
                    .catch((error) => {
                        failCount += 1;
                        console.error('Error importing storage entry:', error, entry);
                    })
            );

            await Promise.allSettled(promises);

            if (failCount > 0) {
                showCopiedMessage(`Storage import finished: ${successCount} succeeded, ${failCount} failed.`);
            } else {
                showCopiedMessage(`Storage import finished: ${successCount} keys imported successfully.`);
            }

            await fetchStorageEntries();
        }

        async function handleProfileImport(parsedInput) {
            if (!importError) return;

            let parsedResult;
            try {
                parsedResult = parseProfileImportPayload(parsedInput);
            } catch (error) {
                importError.textContent = error instanceof Error ? error.message : 'Invalid profile payload.';
                return;
            }

            const importedProfile = parsedResult.profile;
            const existingProfile = loadSavedProfilesSorted().find((profile) =>
                profile.name.toLowerCase() === importedProfile.name.toLowerCase()
            );

            if (existingProfile) {
                const shouldOverwrite = confirm(`Profile "${existingProfile.name}" exists. Overwrite with imported profile?`);
                if (!shouldOverwrite) {
                    return;
                }
                importedProfile.id = existingProfile.id;
                importedProfile.createdAt = existingProfile.createdAt;
            }

            upsertProfileRecord(localStorage, importedProfile);
            hideImportModal();

            if (parsedResult.migratedFromVersion) {
                showCopiedMessage(
                    `Profile "${importedProfile.name}" imported (migrated from v${parsedResult.migratedFromVersion}).`
                );
            } else {
                showCopiedMessage(`Profile "${importedProfile.name}" imported.`);
            }
        }

    } catch (error) {
        hasInitializedSidePanelApp = false;
        console.error('Crumble initialization failed.', error);
        throw error;
    }

} // End initializeSidePanelApp
