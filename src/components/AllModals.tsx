import { Modal } from './Modal';

/** All application modals, using the unified Modal component for consistent structure. */
export function AllModals() {
    return (
        <>
            {/* ── Cookie Edit Modal ────────────────────────────── */}
            <Modal
                id="cookie-edit-modal"
                title="Edit Cookie"
                titleId="cookie-modal-title"
                closeId="close-cookie-modal"
                footer={
                    <>
                        <button type="button" id="cancel-cookie-modal-btn" className="btn secondary-btn">
                            Cancel
                        </button>
                        <button type="submit" id="save-cookie-modal-btn" className="btn primary-btn" form="cookie-form">
                            Save Cookie
                        </button>
                    </>
                }
            >
                <form id="cookie-form" className="sheet-form">
                    <input type="hidden" id="cookie-form-original-name" />
                    <input type="hidden" id="cookie-form-original-domain" />
                    <input type="hidden" id="cookie-form-original-path" />
                    <input type="hidden" id="cookie-form-storeId" />
                    <div className="sheet-form-body">
                        <div className="form-group">
                            <label htmlFor="cookie-form-name">Name</label>
                            <input type="text" id="cookie-form-name" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="cookie-form-value">Value</label>
                            <textarea id="cookie-form-value" rows={3} required />
                        </div>
                        <div className="form-group two-col-grid">
                            <div>
                                <label htmlFor="cookie-form-domain">Domain</label>
                                <input type="text" id="cookie-form-domain" />
                            </div>
                            <div>
                                <label htmlFor="cookie-form-path">Path</label>
                                <input type="text" id="cookie-form-path" defaultValue="/" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="cookie-form-expirationDate">
                                Expiration (local time, empty = session)
                            </label>
                            <input type="datetime-local" id="cookie-form-expirationDate" />
                        </div>
                        <div className="form-group flags-group">
                            <label>
                                <span>Secure</span>
                                <input type="checkbox" id="cookie-form-secure" />
                            </label>
                            <label>
                                <span>HttpOnly</span>
                                <input type="checkbox" id="cookie-form-httpOnly" />
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="cookie-form-sameSite">SameSite</label>
                            <select id="cookie-form-sameSite" defaultValue="lax">
                                <option value="no_restriction">None</option>
                                <option value="lax">Lax</option>
                                <option value="strict">Strict</option>
                            </select>
                        </div>
                    </div>
                    <div id="cookie-form-error" className="error-message" />
                </form>
            </Modal>

            {/* ── Storage Edit Modal ───────────────────────────── */}
            <Modal
                id="storage-edit-modal"
                title="Add Storage Key"
                titleId="storage-modal-title"
                closeId="close-storage-modal"
                footer={
                    <>
                        <button type="button" id="cancel-storage-modal-btn" className="btn secondary-btn">
                            Cancel
                        </button>
                        <button type="submit" id="save-storage-modal-btn" className="btn primary-btn" form="storage-form">
                            Save Entry
                        </button>
                    </>
                }
            >
                <form id="storage-form" className="sheet-form">
                    <input type="hidden" id="storage-form-original-key" />
                    <div className="sheet-form-body">
                        <div className="form-group">
                            <label htmlFor="storage-form-key">Key</label>
                            <input type="text" id="storage-form-key" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="storage-form-value">Value</label>
                            <textarea id="storage-form-value" rows={4} required />
                        </div>
                    </div>
                    <div id="storage-form-error" className="error-message" />
                </form>
            </Modal>

            {/* ── Import Modal ─────────────────────────────────── */}
            <Modal
                id="import-modal"
                title="Import Cookies"
                titleId="import-modal-title"
                closeId="close-import-modal"
                footer={
                    <>
                        <button type="button" id="cancel-import-modal-btn" className="btn secondary-btn">
                            Cancel
                        </button>
                        <button type="button" id="import-confirm-btn" className="btn primary-btn">
                            Import Cookies
                        </button>
                    </>
                }
            >
                <p id="import-modal-description" className="modal-description">
                    Paste JSON array of cookie objects below:
                </p>
                <textarea
                    id="import-json-area"
                    rows={10}
                    placeholder='[{"name": "myCookie", "value": "myValue", "domain": ".example.com", ...}]'
                />
                <div id="import-error" className="error-message" />
            </Modal>

            {/* ── Bulk Delete Modal ────────────────────────────── */}
            <Modal
                id="bulk-delete-modal"
                title="Bulk Delete Preview"
                titleId="bulk-delete-modal-title"
                closeId="close-bulk-delete-modal"
                footer={
                    <>
                        <button type="button" id="cancel-bulk-delete-btn" className="btn secondary-btn">
                            Cancel
                        </button>
                        <button type="button" id="confirm-bulk-delete-btn" className="btn primary-btn btn-danger">
                            Delete Cookies
                        </button>
                    </>
                }
            >
                <p id="bulk-delete-summary" className="modal-description">
                    Previewing impacted cookies...
                </p>
                <div id="bulk-delete-preview-meta" className="preview-meta" />
                <ul id="bulk-delete-preview-list" className="preview-list" />
                <div className="form-group">
                    <label htmlFor="bulk-delete-confirm-input" id="bulk-delete-confirmation-phrase">
                        Type DELETE to confirm:
                    </label>
                    <input
                        type="text"
                        id="bulk-delete-confirm-input"
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                <div id="bulk-delete-error" className="error-message" />
            </Modal>

            {/* ── Profile Diff Modal ───────────────────────────── */}
            <Modal
                id="profile-diff-modal"
                title="Profile Diff"
                closeId="close-profile-diff-modal"
                footer={
                    <button type="button" id="close-profile-diff-btn" className="btn secondary-btn">
                        Close
                    </button>
                }
            >
                <div className="form-group">
                    <label htmlFor="profile-select">Saved Profile</label>
                    <select id="profile-select" />
                </div>
                <div id="profile-diff-summary" className="preview-meta" />
                <ul id="profile-diff-list" className="preview-list" />
                <div id="profile-diff-error" className="error-message" />
            </Modal>

            {/* ── Command Palette Modal ────────────────────────── */}
            <Modal
                id="command-palette-modal"
                title="Command Palette"
                closeId="close-command-palette-modal"
                footer={
                    <button type="button" id="close-command-palette-btn" className="btn secondary-btn">
                        Close
                    </button>
                }
            >
                <div className="form-group">
                    <label htmlFor="command-palette-input">Type a command</label>
                    <input type="text" id="command-palette-input" placeholder="Search commands..." />
                </div>
                <ul id="command-palette-list" className="preview-list" />
                <div id="command-palette-error" className="error-message" />
            </Modal>

            {/* ── JSON Viewer Modal ────────────────────────────── */}
            <Modal
                id="json-view-modal"
                title="JSON Viewer"
                titleId="json-view-title"
                closeId="close-json-view-modal"
                contentClassName="json-view-modal-content"
                footer={
                    <button type="button" id="close-json-view-btn" className="btn secondary-btn">
                        Close
                    </button>
                }
            >
                <div id="json-view-tree" className="json-view-tree" />
            </Modal>
        </>
    );
}
