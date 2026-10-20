import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import qrcode from 'qrcode-generator';
import type { Character } from '../character';
import { db } from '../db/db';
import { download } from '../sheetActions';
import { buildPayload, encodeShare, lightSpells, payloadFileName, shareUrl } from '../share';
import { shrinkPortrait } from '../portrait';
import { Modal } from './Modal';

/** Largest link we put in a QR code; beyond this phones struggle to scan it. */
const QR_MAX = 2200;

/**
 * Share one character (or back up all of them) as a file, a link or a QR code.
 * Notes stay private unless the player ticks the box. The sheet PDF never goes along.
 * Spell ideas: a backup takes them all; one character takes its own when ticked, in full
 * in the file and without AI answers and log in the link (the QR code leaves them out).
 */
export function ShareDialog({
  characters,
  title,
  backup = false,
  onClose,
}: {
  characters: Character[];
  title: string;
  /** a backup file also takes the spell ideas along */
  backup?: boolean;
  onClose: () => void;
}) {
  const [includeNotes, setIncludeNotes] = useState(characters.length > 1);
  const [url, setUrl] = useState('');
  // the QR code holds ~2 KB, so it gets its own link without the portrait
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const hasNotes = characters.some((c) => c.notes.trim());
  const spellCount = useLiveQuery(() => (backup ? db.spells.count() : 0), [backup]) ?? 0;
  const [includeSpells, setIncludeSpells] = useState(false);
  const single = characters.length === 1 ? characters[0].id : '';
  const ownSpells = useLiveQuery(() => (single && !backup ? db.spells.where('characterId').equals(single).toArray() : []), [single, backup]);

  useEffect(() => {
    let live = true;
    setQr(null);
    (async () => {
      const bare = buildPayload(characters, includeNotes, false);
      const qr = shareUrl(await encodeShare(bare));
      // links carry a small copy of the portrait; the file has the full one
      const linked = buildPayload(characters, includeNotes, false, includeSpells && ownSpells ? lightSpells(ownSpells) : []);
      const withThumb = {
        ...linked,
        characters: await Promise.all(
          linked.characters.map(async (sc, i) => {
            const p = characters[i].portrait;
            return p ? { ...sc, portrait: await shrinkPortrait(p).catch(() => undefined) } : sc;
          }),
        ),
      };
      const link = shareUrl(await encodeShare(withThumb));
      if (live) {
        setQrUrl(qr);
        setUrl(link);
      }
    })();
    return () => {
      live = false;
    };
  }, [characters, includeNotes, includeSpells, ownSpells]);

  const file = async () => {
    const spells = backup ? await db.spells.toArray() : includeSpells ? (ownSpells ?? []) : [];
    const p = buildPayload(characters, includeNotes, true, spells);
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
    const code = qrcode(0, qrUrl.length > 1500 ? 'L' : 'M');
    code.addData(qrUrl);
    code.make();
    setQr(code.createSvgTag({ cellSize: 4, margin: 3, scalable: true }));
  };

  const canShare = typeof navigator.share === 'function';

  return (
    <Modal title={title} onClose={onClose}>
      <p className="empty-small">
        {characters.length === 1
          ? 'Whoever opens it gets their own copy. Their changes never reach yours.'
          : `A backup of all ${characters.length} characters${spellCount ? ` and ${spellCount === 1 ? 'one spell idea' : `${spellCount} spell ideas`}` : ''}. Importing it adds them, nothing gets overwritten.`}{' '}
        The stored PDF sheet is not included.
        {characters.some((c) => c.portrait) && characters.length === 1 && ' Links carry a small copy of the portrait; QR codes leave it out.'}
      </p>
      {hasNotes && (
        <label className="check">
          <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
          Include notes
        </label>
      )}
      {!backup && ownSpells && ownSpells.length > 0 && (
        <>
          <label className="check">
            <input type="checkbox" checked={includeSpells} onChange={(e) => setIncludeSpells(e.target.checked)} />
            Include spell ideas ({ownSpells.length})
          </label>
          {includeSpells && (
            <p className="fine-print">The file takes them whole; the link leaves out the AI answers and the log, the QR code leaves the ideas out.</p>
          )}
        </>
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
            {qrUrl.length <= QR_MAX && (
              <button className="btn" onClick={showQr} disabled={!url}>
                Show QR code
              </button>
            )}
          </>
        )}
      </div>
      {characters.length === 1 && qrUrl.length > QR_MAX && (
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
