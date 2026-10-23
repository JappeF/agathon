import { useEffect, useMemo } from 'react';
import guide from '../help/guide.md?raw';
import { renderMarkdown } from '../help/markdown';

/**
 * The guide (#/help, our own text in src/help/guide.md): contents, then every section.
 * #/help/<section> opens at that section, so the app can link to the part that matters
 * (search tips, experience costs). Part of the bundle, so it works offline too.
 */
export function HelpView({ section }: { section?: string }) {
  const { intro, body, sections } = useMemo(() => {
    const { html, sections } = renderMarkdown(guide);
    // the title and opening lines, then the contents, then the sections
    const found = html.indexOf('<h3');
    const at = found < 0 ? html.length : found;
    return { intro: html.slice(0, at), body: html.slice(at), sections };
  }, []);
  useEffect(() => {
    const target = section && document.getElementById(`help-${section}`);
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [section]);
  return (
    <section className="view help">
      <div className="help-text" dangerouslySetInnerHTML={{ __html: intro }} />
      <nav className="help-contents" aria-label="Contents">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#/help/${s.id}`}
            className={s.id === section ? 'on' : undefined}
            aria-current={s.id === section ? 'location' : undefined}
            // the section already in the address: the hash won't change, so scroll by hand
            onClick={() => s.id === section && document.getElementById(`help-${s.id}`)?.scrollIntoView({ block: 'start' })}
          >
            {s.title}
          </a>
        ))}
      </nav>
      <article className="help-text" dangerouslySetInnerHTML={{ __html: body }} />
    </section>
  );
}
