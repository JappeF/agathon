import { useState } from 'react';
import { FilePick } from './FilePick';
import { Modal } from './Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookError, BOOKS, exportBooks, importBooksFile, readBook, type BookId } from '../books';
import { db, requestPersistence } from '../db/db';
import { download } from '../sheetActions';

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The player's own rulebooks for Copy for AI: add the PDF (only its text is kept, on
 * this device), remove it, or move the index between devices as a private file.
 */
export function BooksPanel() {
  const books = useLiveQuery(() => db.books.toArray(), []);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  // reading a book again takes minutes on a phone, so removing one asks first
  const [removing, setRemoving] = useState<BookId | null>(null);

  const addPdf = async (f?: File) => {
    if (!f) return;
    setMessage('');
    setBusy({ done: 0, total: 1 });
    try {
      const b = await readBook(f, (done, total) => setBusy({ done, total }));
      await db.books.put(b);
      requestPersistence();
      setMessage(`${BOOKS[b.id as BookId].title} added: ${b.pages.length} pages.`);
    } catch (e) {
      setMessage(e instanceof BookError ? e.message : `Couldn't read that PDF (${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}).`);
    } finally {
      setBusy(null);
    }
  };
  const loadFile = async (f?: File) => {
    if (!f) return;
    try {
      const added = await importBooksFile(await f.text());
      requestPersistence();
      setMessage(`Loaded ${added.map((b) => BOOKS[b.id as BookId].short).join(' and ')}.`);
    } catch (e) {
      setMessage(e instanceof BookError ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <section className="books-panel" aria-label="Your rulebooks">
      <h3 className="block-title">Your rulebooks</h3>
      <p className="empty-small">
        Add your M20 or How Do You DO That? PDF and your spell ideas can lean on the book itself: the pages of the spells an idea builds on,
        its Sphere ranks, and the casting and Paradox rules. Handy when you work a spell out, on your own or with an AI.
      </p>
      <ul className="book-list">
        {(Object.keys(BOOKS) as BookId[]).map((id) => {
          const b = books?.find((x) => x.id === id);
          return (
            <li key={id} className={`book-row${b ? ' on' : ''}`}>
              <span className="book-name">{BOOKS[id].title}</span>
              {b ? (
                <span className="book-state">
                  {b.pages.length} pages, added {when(b.importedAt)}
                  <button type="button" className="link-btn" onClick={() => setRemoving(id)}>
                    Remove
                  </button>
                </span>
              ) : (
                <span className="book-state">Not on this device</span>
              )}
            </li>
          );
        })}
      </ul>
      {busy ? (
        <div className="book-progress" role="status">
          <span>Reading the PDF, page {busy.done} of {busy.total}</span>
          <progress max={busy.total} value={busy.done} />
        </div>
      ) : (
        <div className="import-row">
          <FilePick accept="application/pdf,.pdf" onFile={addPdf}>
            Add a PDF
          </FilePick>
          {!!books?.length && (
            <button type="button" className="btn" onClick={async () => download(await exportBooks(), 'agathon-books.json', 'application/json')}>
              Save as a file
            </button>
          )}
          <FilePick accept="application/json,.json" onFile={loadFile}>
            Load a book file
          </FilePick>
        </div>
      )}
      {message && <p className="book-message">{message}</p>}
      <p className="fine-print">Reading a whole book takes a while on a phone: add it on a computer, save it as a file and load that on your phone.</p>
      {removing && (
        <Modal title={`Remove ${BOOKS[removing].short}?`} onClose={() => setRemoving(null)}>
          <p>Its text goes from this device. To use it again you add the PDF again, which takes a few minutes on a phone.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setRemoving(null)}>
              Keep it
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                await db.books.delete(removing);
                setRemoving(null);
              }}
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
