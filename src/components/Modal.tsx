import { type ReactNode, useCallback, useEffect, useRef } from 'react';

interface ModalProps {
    /** Must match the ID the panel-controller expects, e.g. "cookie-edit-modal" */
    id: string;
    /** Modal title text — can be overridden via titleId if the controller updates it */
    title: string;
    /** Optional ID on the <h2> so the controller can update the title text */
    titleId?: string;
    /** ID for the close button in the header */
    closeId: string;
    /** Modal body content */
    children: ReactNode;
    /** Footer action buttons */
    footer: ReactNode;
    /** Whether to use the sheet variant (slides from right) — default true */
    sheet?: boolean;
    /** Optional extra className on .modal-content */
    contentClassName?: string;
}

/**
 * Unified modal component with consistent structure across all 7 modals:
 * - Backdrop click-to-close
 * - Escape key dismissal
 * - Consistent header / scrollable body / sticky footer
 * - Sheet (right-slide) or centered variant
 *
 * The modal is shown/hidden by panel-controller via `modal.style.display`.
 * This component renders the structure; visibility is controller-managed.
 */
export function Modal({
    id,
    title,
    titleId,
    closeId,
    children,
    footer,
    sheet = true,
    contentClassName,
}: ModalProps) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const closeModal = useCallback(() => {
        const el = backdropRef.current;
        if (el) el.style.display = 'none';
    }, []);

    // Click on backdrop (outside modal content) closes the modal
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === backdropRef.current) {
                closeModal();
            }
        },
        [closeModal],
    );

    // Escape key closes the modal
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key !== 'Escape') return;
            const el = backdropRef.current;
            if (el && el.style.display !== 'none') {
                closeModal();
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [closeModal]);

    return (
        <div
            id={id}
            className="modal"
            style={{ display: 'none' }}
            ref={backdropRef}
            onClick={handleBackdropClick}
        >
            <div
                className={`modal-content${sheet ? '' : ' modal-content--centered'}${contentClassName ? ` ${contentClassName}` : ''}`}
                ref={contentRef}
            >
                <div className="modal-header">
                    <h2 id={titleId}>{title}</h2>
                    <button
                        type="button"
                        className="close-btn"
                        id={closeId}
                        onClick={closeModal}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">{footer}</div>
            </div>
        </div>
    );
}
