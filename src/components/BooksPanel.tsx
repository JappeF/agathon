import { useRef, useState } from 'react';
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
  const pdfInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState('');

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
      setMessage(e instanceof BookError ? e.message : "Couldn't read that PDF.");
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
        Add your own PDF of the M20 core book or How Do You DO That? and Copy for AI can take the real pages along. Only the text is kept, on this
        device; it is never shared.
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
                  <button type="button" className="link-btn" onClick={() => db.books.delete(id)}>
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
          <button type="button" className="btn" onClick={() => pdfInput.current?.click()}>
            Add a PDF
          </button>
          {!!books?.length && (
            <button type="button" className="btn" onClick={async () => download(await exportBooks(), 'agathon-books.json', 'application/json')}>
              Save as a file
            </button>
          )}
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Load a book file
          </button>
        </div>
      )}
      {message && <p className="book-message">{message}</p>}
      <p className="fine-print">Reading a whole book takes a while on a phone. You can add it on a computer, save it as a file and load that on your phone.</p>
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          addPdf(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          loadFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </section>
  );
}
