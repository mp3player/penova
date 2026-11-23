/**
 * Strips an outer Markdown fenced code block (``` or ~~~) when external tools
 * or pasted snippets wrap the entire script in triple backticks/tildes.
 */
export function stripMarkdownFence(raw: string): string {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const fenceMatch = normalized.match(
    /^(```|~~~)[^\n]*\n([\s\S]*?)\n\1\s*$/
  );
  if (fenceMatch) {
    return fenceMatch[2];
  }
  return raw;
}

/**
 * Splits a `{k1: v1, k2: v2}` metadata body on `,` / `，` / `;` / `；`
 * while respecting single/double quoted strings and backslash escapes.
 */
export function splitMetaPairs(metaRaw: string): string[] {
  const pairs: string[] = [];
  let current = '';
  let quoteChar: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < metaRaw.length; i++) {
    const ch = metaRaw[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }
    if (quoteChar) {
      current += ch;
      if (ch === quoteChar) {
        quoteChar = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      current += ch;
      quoteChar = ch;
      continue;
    }
    if (ch === ',' || ch === '，' || ch === ';' || ch === '；') {
      const trimmed = current.trim();
      if (trimmed) pairs.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }

  const tail = current.trim();
  if (tail) pairs.push(tail);
  return pairs;
}

export function unquoteMetaString(raw: string): string {
  const trimmed = raw.trim();
  let inner = trimmed;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    inner = trimmed.slice(1, -1);
  }
  return inner.replace(/\\n/g, '\n').replace(/\\(["'\\])/g, '$1');
}

export function formatMetaString(raw: string): string {
  const escapedNewlines = raw.replace(/\r?\n/g, '\\n').trim();
  if (/[,，;；:{}"'\\]/.test(escapedNewlines)) {
    const escaped = escapedNewlines.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return escapedNewlines;
}
