import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import type { Character } from '../character';
import { download } from '../sheetActions';
import { buildPayload, encodeShare, payloadFileName, shareUrl } from '../share';
import { Modal } from './Modal';

/** Largest link we put in a QR code; beyond this phones struggle to scan it. */
const QR_MAX = 2200;

/**
 * Share one character (or back up all of them) as a file, a link or a QR code.
 * Notes stay private unless the player ticks the box. The sheet PDF never goes along.
 */
export function ShareDialog({ characters, title, onClose }: { characters: Character[]; title: string; onClose: () => void }) {
  const [includeNotes, setIncludeNotes] = useState(characters.length > 1);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const hasNotes = characters.some((c) => c.notes.trim());

  useEffect(() => {
    let live = true;
    setQr(null);
    encodeShare(buildPayload(characters, includeNotes)).then((enc) => live && setUrl(shareUrl(enc)));
    return () => {
      live = false;
    };
  }, [characters, includeNotes]);

  const file = () => {
    const p = buildPayload(characters, includeNotes);
    download(JSON.stringify(p, null, 2), payloadFileName(p), 'application/json');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${characters[0].name} in Agathon`, url });
    } catch {
      // cancelled by the player: nothing to do
    }
  };

  const showQr = () => {
    const code = qrcode(0, url.length > 1500 ? 'L' : 'M');
    code.addData(url);
    code.make();
    setQr(code.createSvgTag({ cellSize: 4, margin: 3, scalable: true }));
  };

  const canShare = typeof navigator.share === 'function';

  return (
    <Modal title={title} onClose={onClose}>
      <p className="empty-small">
        {characters.length === 1
          ? 'Whoever opens it gets their own copy. Their changes never reach yours.'
          : `A backup of all ${characters.length} characters. Importing it adds them, nothing gets overwritten.`}{' '}
        The stored PDF sheet is not included.
      </p>
      {hasNotes && (
        <label className="check">
          <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
          Include notes
        </label>
      )}
      <div className="share-actions">
        <button className="btn" onClick={file}>
          Download file
        </button>
        {characters.length === 1 && (
          <>
            {canShare && (
              <button className="btn" onClick={nativeShare} disabled={!url}>
                Share link
              </button>
            )}
            <button className="btn" onClick={copy} disabled={!url}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            {url.length <= QR_MAX && (
              <button className="btn" onClick={showQr} disabled={!url}>
                Show QR code
              </button>
            )}
          </>
        )}
      </div>
      {characters.length === 1 && url.length > QR_MAX && (
        <p className="empty-small">This character is too big for a QR code. Use the link or the file.</p>
      )}
      {qr && <div className="qr" role="img" aria-label="QR code with the share link" dangerouslySetInnerHTML={{ __html: qr }} />}
      <div className="modal-actions">
        <button className="btn btn-gold" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
