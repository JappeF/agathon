import type { ReactNode } from 'react';

/**
 * Android's picker greys out .json files (it doesn't map them to application/json), so a
 * picker that takes JSON drops its filter there; the contents are checked anyway. Image
 * and PDF filters stay: without image/* Android offers camera and files, not the gallery.
 */
const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const filterFor = (accept?: string) => (ANDROID && accept && /json/i.test(accept) ? undefined : accept);

/**
 * A button that opens the file picker. It is a <label> around a real, visually hidden
 * file input, so the tap itself opens the picker. Android didn't reliably open it for a
 * display:none input clicked from script.
 */
export function FilePick({
  children,
  className = 'btn',
  accept,
  disabled,
  onFile,
}: {
  children: ReactNode;
  className?: string;
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className={`file-pick ${className}${disabled ? ' disabled' : ''}`}>
      {children}
      <input
        type="file"
        className="file-input"
        accept={filterFor(accept)}
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
