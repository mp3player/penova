#!/usr/bin/env python3
"""
Bundle Penova's headless engine, registries, built-in plugins, codecs, and exporters
into a single zero-dependency TypeScript file inside `.agents/skills/penova-animation/scripts/render-script.ts`.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / ".agents/skills/penova-animation/scripts/render-script.ts"

ENTRY_ROOTS = [
    "src/plugins/index.ts",
    "src/engine/export/videoExporter.ts",
    "src/engine/parser/projectScript.ts",
    "src/model/projectStorage.ts",
    "src/engine/timeline/projectTimeline.ts",
    "src/engine/subtitle/subtitleEngine.ts",
]

EXCLUDED_MODULES = {
    "src/plugins/useRegistryList.ts",
}

REGEX_PREV_CHARS = set("([{:;,=!?&|^~+-*%<>")
REGEX_PREV_KEYWORDS = {"return", "throw", "case", "typeof", "void", "delete", "in", "of", "else"}


def resolve_rel_import(src_rel: str, rel_target: str) -> str | None:
    base = os.path.normpath(os.path.join(os.path.dirname(src_rel), rel_target)).replace("\\", "/")
    if os.path.isfile(ROOT / (base + ".ts")):
        return base + ".ts"
    if os.path.isdir(ROOT / base) and os.path.isfile(ROOT / base / "index.ts"):
        return base + "/index.ts"
    return None


def collect_ordered_modules() -> list[str]:
    visited: set[str] = set()
    ordered: list[str] = []

    def dfs(mod_rel: str) -> None:
        if mod_rel in visited or mod_rel in EXCLUDED_MODULES:
            return
        visited.add(mod_rel)
        text = (ROOT / mod_rel).read_text(encoding="utf-8")
        for m in re.finditer(
            r"""^\s*(?:import|export)\b[\s\S]*?(?:from\s+)?['"](\.[^'"]+)['"]""",
            text,
            re.M,
        ):
            target = resolve_rel_import(mod_rel, m.group(1))
            if target:
                dfs(target)
        ordered.append(mod_rel)

    for root in ENTRY_ROOTS:
        dfs(root)
    return ordered


def split_top_level_statements(code: str) -> list[str]:
    """Split a TypeScript module into top-level statements while tracking strings, comments, regexes, and brackets."""
    stmts: list[str] = []
    n = len(code)
    i = 0
    stmt_start = 0
    brace = 0
    paren = 0
    bracket = 0
    template_brace_stack: list[int] = []
    last_sig_char = ";"
    last_word = ""

    def flush(end_idx: int) -> None:
        nonlocal stmt_start
        chunk = code[stmt_start:end_idx].strip()
        if chunk:
            stmts.append(chunk)
        stmt_start = end_idx

    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""

        # Line comment
        if ch == "/" and nxt == "/":
            nl = code.find("\n", i + 2)
            i = n if nl == -1 else nl + 1
            continue

        # Block comment
        if ch == "/" and nxt == "*":
            end = code.find("*/", i + 2)
            i = n if end == -1 else end + 2
            continue

        # Single / Double quoted string
        if ch in ("'", '"'):
            quote = ch
            i += 1
            while i < n:
                if code[i] == "\\":
                    i += 2
                    continue
                if code[i] == quote:
                    i += 1
                    break
                i += 1
            last_sig_char = quote
            last_word = ""
            continue

        # Template literal
        if ch == "`":
            i += 1
            while i < n:
                if code[i] == "\\":
                    i += 2
                    continue
                if code[i] == "`":
                    i += 1
                    break
                if code[i] == "$" and i + 1 < n and code[i + 1] == "{":
                    template_brace_stack.append(brace)
                    brace += 1
                    i += 2
                    break
                i += 1
            last_sig_char = "`"
            last_word = ""
            continue

        # Regex literal heuristic
        if ch == "/" and (last_sig_char in REGEX_PREV_CHARS or last_word in REGEX_PREV_KEYWORDS):
            i += 1
            in_class = False
            while i < n:
                rc = code[i]
                if rc == "\\":
                    i += 2
                    continue
                if rc == "[":
                    in_class = True
                elif rc == "]":
                    in_class = False
                elif rc == "/" and not in_class:
                    i += 1
                    while i < n and code[i].isalpha():
                        i += 1
                    break
                elif rc == "\n":
                    break
                i += 1
            last_sig_char = "/"
            last_word = ""
            continue

        # Template expression closing back into string
        if ch == "}" and template_brace_stack and brace - 1 == template_brace_stack[-1]:
            template_brace_stack.pop()
            brace -= 1
            i += 1
            while i < n:
                if code[i] == "\\":
                    i += 2
                    continue
                if code[i] == "`":
                    i += 1
                    break
                if code[i] == "$" and i + 1 < n and code[i + 1] == "{":
                    template_brace_stack.append(brace)
                    brace += 1
                    i += 2
                    break
                i += 1
            last_sig_char = "`"
            last_word = ""
            continue

        if ch == "{":
            brace += 1
        elif ch == "}":
            brace = max(0, brace - 1)
            if brace == 0 and paren == 0 and bracket == 0:
                # Check if statement is a block declaration (function, class, interface) or followed by `;`
                snippet = code[stmt_start : i + 1].lstrip()
                snippet_nc = re.sub(r"^(?://[^\n]*\n|/\*[\s\S]*?\*/|\s)+", "", snippet)
                is_type_or_fn_or_class = bool(
                    re.match(
                        r"^(?:export\s+)?(?:async\s+)?(?:function|class|interface)\b",
                        snippet_nc,
                    )
                )
                j = i + 1
                while j < n and code[j] in " \t\r\n":
                    j += 1
                if j < n and code[j] == ";":
                    flush(j + 1)
                    i = j + 1
                    last_sig_char = ";"
                    last_word = ""
                    continue
                elif is_type_or_fn_or_class and not (j < n and code[j] in "(.[{>&|,"):
                    flush(i + 1)
                    i += 1
                    last_sig_char = "}"
                    last_word = ""
                    continue
        elif ch == "(":
            paren += 1
        elif ch == ")":
            paren = max(0, paren - 1)
        elif ch == "[":
            bracket += 1
        elif ch == "]":
            bracket = max(0, bracket - 1)
        elif ch == ";" and brace == 0 and paren == 0 and bracket == 0:
            flush(i + 1)
            i += 1
            last_sig_char = ";"
            last_word = ""
            continue

        if ch.isalpha() or ch == "_" or ch == "$":
            w_start = i
            while i < n and (code[i].isalnum() or code[i] in "_$"):
                i += 1
            last_word = code[w_start:i]
            last_sig_char = code[i - 1]
            continue

        if not ch.isspace():
            last_sig_char = ch
            last_word = ""
        i += 1

    flush(n)
    return stmts


def strip_leading_comments(stmt: str) -> tuple[str, str]:
    m = re.match(r"^((?://[^\n]*\n|/\*[\s\S]*?\*/|\s)*)([\s\S]*)$", stmt)
    assert m is not None
    return m.group(1), m.group(2)


def process_module(mod_rel: str) -> tuple[list[str], list[str], list[str]]:
    """Returns (type_decls, runtime_stmts, exported_runtime_names)."""
    raw = (ROOT / mod_rel).read_text(encoding="utf-8")
    stmts = split_top_level_statements(raw)

    type_decls: list[str] = []
    runtime_stmts: list[str] = []
    exported_names: list[str] = []

    for stmt in stmts:
        lead, body = strip_leading_comments(stmt)
        if not body:
            continue

        # Strip module import declarations
        if re.match(r"^import\b", body):
            continue

        # Strip re-export-from declarations or `export type { ... }`
        if re.match(r"^export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['\"][^'\"]+['\"]", body):
            continue
        if re.match(r"^export\s+type\s*\{[\s\S]*?\}\s*;?$", body):
            continue

        # Standalone `export { A, B }` without `from`
        m_reexport = re.match(r"^export\s*\{([\s\S]*?)\}\s*;?$", body)
        if m_reexport:
            for item in m_reexport.group(1).split(","):
                name = item.strip()
                if name and name != "useRegistryList" and name not in exported_names:
                    exported_names.append(name)
            continue

        # Type / Interface declarations (hoisted to top-level)
        if re.match(r"^(?:export\s+)?(?:interface|type)\s+[A-Za-z0-9_]+", body):
            clean_type = re.sub(r"^export\s+", "", body, count=1)
            type_decls.append(f"{lead}{clean_type}")
            continue

        # Runtime declarations (exported or module-private)
        m_decl = re.match(
            r"^export\s+(?:async\s+function|function|const|let|class)\s+([A-Za-z0-9_]+)\b",
            body,
        )
        if m_decl:
            sym = m_decl.group(1)
            if sym not in exported_names:
                exported_names.append(sym)
            clean_runtime = re.sub(r"^export\s+", "", body, count=1)
            runtime_stmts.append(f"{lead}{clean_runtime}")
            continue

        runtime_stmts.append(stmt)

    return type_decls, runtime_stmts, exported_names


CLI_RUNNER = """
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';

function printUsage(): void {
  console.log(
    [
      'Usage (Self-Contained Penova Skill Runner):',
      '  node render-script.ts --spec',
      '  node render-script.ts <input.penova.md> [output-dir] [--exporter=poster-svg|svg-sequence-tar] [--fps=12]',
      '  # On Node < 22.6 use: npx tsx render-script.ts ...',
    ].join('\\n')
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.includes('--spec')) {
    process.stdout.write(generateScriptSpec());
    return;
  }

  const positional = args.filter((a) => !a.startsWith('--'));
  const inputPath = positional[0];
  if (!inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outDir = resolve(positional[1] ?? './penova-output');
  const exporterArg = args.find((a) => a.startsWith('--exporter='));
  const exporterId = exporterArg
    ? exporterArg.slice('--exporter='.length)
    : 'poster-svg';
  const fpsArg = args.find((a) => a.startsWith('--fps='));
  const fps = fpsArg
    ? Math.max(1, Number(fpsArg.slice('--fps='.length)) || 12)
    : 12;

  const scriptText = readFileSync(resolve(inputPath), 'utf8');
  const stem = basename(inputPath).replace(/\\.(penova\\.md|md|txt)$/i, '');
  mkdirSync(outDir, { recursive: true });

  const poster = await exportScriptToVideo(scriptText, {
    exporterId: 'poster-svg',
    fps,
    onProgress: () => {},
  });

  if (poster.warnings.length > 0) {
    console.warn('Warnings:');
    for (const w of poster.warnings) console.warn(`  - ${w}`);
  }

  const jsonPath = join(outDir, `${stem}.penova.json`);
  writeFileSync(jsonPath, serializeProjectToJson(poster.project), 'utf8');

  const posterPath = join(outDir, `${stem}.svg`);
  writeFileSync(posterPath, await poster.blob.text(), 'utf8');

  let srtPath: string | null = null;
  if (poster.subtitlesSrt.trim()) {
    srtPath = join(outDir, `${stem}.srt`);
    writeFileSync(srtPath, poster.subtitlesSrt, 'utf8');
  }

  console.log(
    `Project: ${poster.project.title} (${poster.project.scenes.length} scenes)`
  );
  console.log(`  - Studio JSON: ${jsonPath}`);
  console.log(`  - Vector Poster: ${posterPath}`);
  if (srtPath) console.log(`  - Subtitles: ${srtPath}`);

  if (exporterId !== 'poster-svg') {
    const out = await exportScriptToVideo(scriptText, {
      exporterId,
      fps,
      onProgress: (pct) => {
        if (pct === 100 || pct % 25 === 0) {
          console.log(`  [${exporterId}] ${pct}%`);
        }
      },
    });
    const outPath = join(outDir, out.filename);
    const buf = Buffer.from(await out.blob.arrayBuffer());
    writeFileSync(outPath, buf);
    console.log(
      `  - Exported (${exporterId}): ${outPath} (${out.summary ?? ''})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
"""


def build_bundle() -> None:
    modules = collect_ordered_modules()
    parsed = [
        (mod_rel, *process_module(mod_rel))
        for mod_rel in modules
    ]

    all_types: list[str] = []
    for mod_rel, type_decls, _, _ in parsed:
        if type_decls:
            all_types.append(f"// --- Types: {mod_rel} ---")
            all_types.extend(type_decls)

    # Emit runtime modules in topological order, isolating module-private scope in an IIFE
    # and only destructuring symbols actually referenced by later modules or CLI_RUNNER.
    runtime_sections: list[str] = []
    emitted_exports: set[str] = set()
    for idx, (mod_rel, _, runtime_stmts, exported_names) in enumerate(parsed):
        if not runtime_stmts:
            continue
        downstream_blob = "\n".join(
            "\n".join(r) for _, _, r, _ in parsed[idx + 1 :]
        ) + "\n" + CLI_RUNNER
        used_exports = [
            name
            for name in exported_names
            if name not in emitted_exports
            and re.search(rf"\b{re.escape(name)}\b", downstream_blob)
        ]
        emitted_exports.update(used_exports)

        indented_body = "\n".join(
            "  " + line if line.strip() else ""
            for stmt in runtime_stmts
            for line in stmt.splitlines()
        )

        section_lines = [f"// --- Module: {mod_rel} ---"]
        if used_exports:
            export_obj = ", ".join(used_exports)
            section_lines.append(f"const {{ {export_obj} }} = (() => {{")
            section_lines.append(indented_body)
            section_lines.append(f"  return {{ {export_obj} }};")
            section_lines.append("})();")
        else:
            section_lines.append("(() => {")
            section_lines.append(indented_body)
            section_lines.append("})();")

        runtime_sections.append("\n".join(section_lines))

    header = "\n".join(
        [
            "// AUTO-GENERATED SELF-CONTAINED PENOVA SKILL RUNNER",
            "// Do not edit manually; regenerate via: npm run build:skill",
            "// Zero external project or npm dependencies required.",
            "",
        ]
    )

    bundle = "\n\n".join(
        [
            header + CLI_RUNNER.strip().splitlines()[0],
            "\n".join(CLI_RUNNER.strip().splitlines()[1:3]),
            "\n\n".join(all_types),
            "\n\n".join(runtime_sections),
            "\n".join(CLI_RUNNER.strip().splitlines()[3:]),
        ]
    )

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(bundle.rstrip() + "\n", encoding="utf-8")
    print(f"Bundled {len(modules)} modules -> {OUT_FILE.relative_to(ROOT)} ({len(bundle)} bytes)")


if __name__ == "__main__":
    build_bundle()
