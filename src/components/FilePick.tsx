import type { ReactNode } from 'react';

/**
 * A picker that takes JSON shows every file, on every device: Android greys out .json
 * files, and a shared character file that came through a chat or a phone often has
 * another name or extension (".json.txt", no extension), so a filter hid it. The contents
 * are checked anyway. Image and PDF-only pickers keep their filter: without image/*
 * Android offers camera and files, not the gallery.
 */
const filterFor = (accept?: string) => (accept && /json/i.test(accept) ? undefined : accept);

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
