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
