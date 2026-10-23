/**
 * Just enough Markdown for the guide (src/help/guide.md, our own text): headings with an
 * id ("## Experience {#experience}"), paragraphs, "- " lists, tables, **bold**, `code`
 * and [links](#/library). Everything is escaped first, so only these few tags come out.
 */

export interface Section {
  id: string;
  title: string;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  return escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((#[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

/** The guide as HTML, plus its sections (the ## headings) for the contents and deep links. */
export function renderMarkdown(md: string): { html: string; sections: Section[] } {
  const out: string[] = [];
  const sections: Section[] = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = /^(#{1,3}) (.+?)(?: \{#([a-z0-9-]+)\})?$/.exec(line);
    if (!line.trim()) {
      i++;
    } else if (heading) {
      const level = heading[1].length + 1; // # is the page title (h2), ## a section (h3)
      const id = heading[3];
      if (heading[1] === '##' && id) sections.push({ id, title: heading[2] });
      out.push(`<h${level}${id ? ` id="help-${id}"` : ''}>${inline(heading[2])}</h${level}>`);
      i++;
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      out.push(`<ul>${items.join('')}</ul>`);
    } else if (line.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows; // the second row is the --- divider
      out.push(
        `<div class="help-table"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
  }
  return { html: out.join('\n'), sections };
}
