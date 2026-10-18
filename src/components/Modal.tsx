import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from './useDialog';

/**
 * A centred dialog over a dimmed page; Escape or the backdrop closes it. Rendered
 * into <body> so it survives its trigger being hidden (e.g. inside a closed menu).
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose);
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
