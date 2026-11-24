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
  return inner.replace(/\\(n|"|'|\\)/g, (_, ch: string) =>
    ch === 'n' ? '\n' : ch
  );
}

export function formatMetaString(raw: string): string {
  const trimmed = raw.trim();
  const needsQuoting =
    /[\r\n,，;；:{}"'\\]/.test(trimmed) ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    (trimmed !== '' && !Number.isNaN(Number(trimmed)));
  if (needsQuoting) {
    const escaped = trimmed
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, '\\n');
    return `"${escaped}"`;
  }
  return trimmed;
}

/**
 * Extracts a trailing `{...}` metadata block while ignoring apostrophes,
 * quotes, or unmatched `{` in the body text outside the trailing block.
 */
export function extractTrailingMetaBlock(
  text: string
): { body: string; metaRaw: string } | null {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('}')) return null;

  for (let start = 0; start < trimmed.length; start++) {
    if (trimmed[start] !== '{') continue;

    let quote: '"' | "'" | null = null;
    let depth = 0;
    let matchedEnd = -1;

    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (quote) {
        if (ch === '\\') {
          i++;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }
      if (depth > 0 && (ch === '"' || ch === "'")) {
        quote = ch;
        continue;
      }
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          matchedEnd = i;
          break;
        }
      }
    }

    if (matchedEnd === trimmed.length - 1 && quote === null) {
      return {
        body: trimmed.slice(0, start).trimEnd(),
        metaRaw: trimmed.slice(start + 1, matchedEnd),
      };
    }
  }

  return null;
}
