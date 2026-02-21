import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface DropdownProps {
    /** Must match the ID the panel-controller expects, e.g. "export-dropdown" */
    id: string;
    icon: string;
    label: string;
    children: ReactNode;
    disabled?: boolean;
}

/**
 * Dropdown that uses a controlled open state instead of the native <details>
 * element, so we can close on outside click.
 *
 * All child buttons retain their original IDs for panel-controller compatibility.
 */
export function Dropdown({ id, icon, label, children, disabled }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const toggle = useCallback(() => {
        if (!disabled) setOpen((p) => !p);
    }, [disabled]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick, true);
        return () => document.removeEventListener('mousedown', handleClick, true);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    return (
        <div
            id={id}
            ref={ref}
            className={`action-dropdown${disabled ? ' disabled' : ''}`}
        >
            <button
                type="button"
                className="action-btn"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <i className={`fas ${icon}`} aria-hidden="true" /> {label}
            </button>
            <div
                className="dropdown-content"
                style={open ? undefined : { display: 'none' }}
                onClick={() => setOpen(false)}
            >
                {children}
            </div>
        </div>
    );
}
