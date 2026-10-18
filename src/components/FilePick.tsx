import type { ReactNode } from 'react';

/** Android's picker greys out files whose type it doesn't map; we check contents anyway. */
const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/**
 * A button that opens the file picker. It is a <label> around a real, visually hidden
 * file input, so the tap itself opens the picker. Android didn't reliably open it for a
 * display:none input clicked from script, and its picker greys out .json files whose
 * type it doesn't recognise, so JSON pickers take any file and the contents are checked.
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
        accept={ANDROID ? undefined : accept}
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
