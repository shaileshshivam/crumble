import { Dropdown } from './Dropdown';

interface HeaderProps {
    themeIcon: string;
    themeLabel: string;
    onCycleTheme: () => void;
}

export function Header({ themeIcon, themeLabel, onCycleTheme }: HeaderProps) {
    return (
        <div className="header">
            <div className="header-top">
                <div className="header-eyebrow">
                    <i className="fas fa-cookie-bite" aria-hidden="true" />
                    Crumble
                </div>
                <div className="header-controls">
                    <button
                        id="toggle-redaction-btn"
                        className="action-btn mask-toggle-btn"
                        title="Toggle Value Masking"
                        type="button"
                    >
                        <i className="fas fa-eye-slash" aria-hidden="true" />
                        <span className="mask-label">Mask</span>
                    </button>
                    <button
                        className="action-btn theme-toggle-btn"
                        title={`Theme: ${themeLabel} (click to cycle)`}
                        onClick={onCycleTheme}
                        type="button"
                    >
                        <i className={`fas ${themeIcon}`} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="search-container">
                <i className="fas fa-search search-icon" aria-hidden="true" />
                <input type="text" id="search-input" placeholder="Search cookies..." />
                <button
                    id="open-command-palette-btn"
                    className="search-shortcut-badge"
                    title="Command Palette (Ctrl/Cmd + K)"
                    type="button"
                >
                    ⌘K
                </button>
                <button id="clear-search" style={{ display: 'none' }} type="button">
                    ×
                </button>
            </div>

            <div className="global-actions">
                <div className="action-group action-group--data">
                    <button id="import-cookies-btn" className="action-btn" title="Import from JSON" type="button">
                        <i className="fas fa-file-import" aria-hidden="true" /> Import
                    </button>
                    <Dropdown id="export-dropdown" icon="fa-file-export" label="Export">
                        <button id="export-all-btn" type="button">
                            <i className="fas fa-globe" aria-hidden="true" /> All Cookies
                        </button>
                        <button id="export-filtered-btn" type="button">
                            <i className="fas fa-filter" aria-hidden="true" /> Filtered Cookies
                        </button>
                        <button id="export-domain-btn" type="button">
                            <i className="fas fa-at" aria-hidden="true" /> Current Domain
                        </button>
                    </Dropdown>
                </div>

                <div className="action-group action-group--manage">
                    <Dropdown id="bulk-delete-dropdown" icon="fa-trash-alt" label="Bulk Delete">
                        <button id="delete-filtered-btn" type="button">
                            <i className="fas fa-broom" aria-hidden="true" /> Delete All Filtered
                        </button>
                        <button id="delete-session-filtered-btn" type="button">
                            <i className="fas fa-clock" aria-hidden="true" /> Delete Session Only
                        </button>
                        <button id="delete-nonpinned-filtered-btn" type="button">
                            <i className="fas fa-thumbtack" aria-hidden="true" /> Delete Non-Pinned
                        </button>
                    </Dropdown>
                    <button
                        id="restore-snapshot-btn"
                        className="action-btn"
                        title="Undo the last bulk delete by restoring the snapshot"
                        type="button"
                    >
                        <i className="fas fa-undo-alt" aria-hidden="true" /> Undo
                    </button>
                </div>

                <div className="action-group action-group--profiles">
                    <Dropdown id="profiles-dropdown" icon="fa-layer-group" label="Profiles">
                        <button id="save-profile-btn" type="button">
                            <i className="fas fa-save" aria-hidden="true" /> Save Current State
                        </button>
                        <button id="compare-profile-btn" type="button">
                            <i className="fas fa-code-branch" aria-hidden="true" /> Compare with Saved
                        </button>
                        <button id="export-profile-btn" type="button">
                            <i className="fas fa-share-square" aria-hidden="true" /> Export Profile
                        </button>
                        <button id="import-profile-btn" type="button">
                            <i className="fas fa-file-download" aria-hidden="true" /> Import Profile
                        </button>
                    </Dropdown>
                </div>
            </div>
        </div>
    );
}
