import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Download,
  Play,
  Upload,
} from 'lucide-react';
import {
  generateScriptSpec,
  serializeProjectScript,
} from '../../engine/parser/projectScript';
import { LessonProject } from '../../model/project';
import { LessonScene } from '../../model/scene';
import { SceneTextCodec } from '../../plugins';
import { useI18n } from '../../i18n';

interface ScriptCodecPaneProps {
  project: LessonProject;
  scene: LessonScene;
  codec?: SceneTextCodec;
  scriptText: string;
  warnings: string[];
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onApplyProjectScript: (raw: string) => { ok: boolean; warnings: string[] };
  onImportProjectFile: (file: File) => void;
  onExportProjectScript: () => void;
  onNotify: (msg: string) => void;
}

export const ScriptCodecPane: React.FC<ScriptCodecPaneProps> = ({
  project,
  scene: _scene,
  codec,
  scriptText,
  warnings,
  onFocus,
  onBlur,
  onChange,
  onApplyProjectScript,
  onImportProjectFile,
  onExportProjectScript,
  onNotify,
}) => {
  const { t, codecMeta } = useI18n();
  const [mode, setMode] = useState<'scene' | 'project'>(
    codec ? 'scene' : 'project'
  );
  const [projectDraft, setProjectDraft] = useState(() =>
    serializeProjectScript(project)
  );
  const [projectWarnings, setProjectWarnings] = useState<string[]>([]);
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const justAppliedRef = useRef(false);
  const scriptImportRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!codec && mode === 'scene') {
      setMode('project');
    }
  }, [codec, mode]);

  useEffect(() => {
    setProjectDraft(serializeProjectScript(project));
    setIsProjectDirty(false);
    if (justAppliedRef.current) {
      justAppliedRef.current = false;
    } else {
      setProjectWarnings([]);
    }
  }, [project]);

  const effectiveMode = codec ? mode : 'project';
  const meta = codec ? codecMeta(codec) : null;
  const activeWarnings =
    effectiveMode === 'scene' ? warnings : projectWarnings;

  const handleCopySpec = async () => {
    const spec = generateScriptSpec();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(spec);
        onNotify(t('toast.specCopied'));
        return;
      }
      onNotify(t('toast.specCopyFailed'));
    } catch {
      onNotify(t('toast.specCopyFailed'));
    }
  };

  const handleApplyProject = () => {
    justAppliedRef.current = true;
    setIsProjectDirty(false);
    const res = onApplyProjectScript(projectDraft);
    setProjectWarnings(res.warnings);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        gap: 9,
        minHeight: 0,
      }}
    >
      {/* Switcher between single-scene live script & multi-scene declarative project script */}
      <div
        className="studio-pill-group"
        style={{ width: '100%', display: 'flex' }}
      >
        {codec && (
          <button
            type="button"
            className={`studio-pill-item ${
              effectiveMode === 'scene' ? 'active' : ''
            }`}
            onClick={() => setMode('scene')}
            style={{ flex: 1, justifyContent: 'center', fontSize: 11.2 }}
          >
            {t('script.sceneMode')}
          </button>
        )}
        <button
          type="button"
          className={`studio-pill-item ${
            effectiveMode === 'project' ? 'active' : ''
          }`}
          onClick={() => {
            if (!isProjectDirty) {
              setProjectDraft(serializeProjectScript(project));
              setProjectWarnings([]);
            }
            setMode('project');
          }}
          style={{ flex: 1, justifyContent: 'center', fontSize: 11.2 }}
        >
          {t('script.projectMode')}
        </button>
      </div>

      {effectiveMode === 'scene' && meta ? (
        <>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: '#101419',
              border: '1px solid var(--border-subtle)',
              fontSize: 11.5,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: 3,
              }}
            >
              {meta.hintTitle}
            </div>
            {meta.hintLines.map((hint, idx) => (
              <div key={idx}>
                <code>{hint}</code>
              </div>
            ))}
          </div>

          <textarea
            className="studio-textarea"
            value={scriptText}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              resize: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.55,
              padding: 10,
            }}
          />
        </>
      ) : (
        <>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: '#101419',
              border: '1px solid var(--border-subtle)',
              fontSize: 11.2,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: 'var(--accent)',
                marginBottom: 2,
              }}
            >
              {t('script.projectHintTitle')}
            </div>
            <div>{t('script.projectHintBody')}</div>
          </div>

          <input
            ref={scriptImportRef}
            type="file"
            accept=".md,.penova.md,.txt,.json,.penova.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setIsProjectDirty(false);
                onImportProjectFile(file);
              }
              e.currentTarget.value = '';
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button
              type="button"
              className="studio-btn primary"
              onClick={handleApplyProject}
              style={{ flex: 1, height: 27, padding: '0 8px', fontSize: 11.5 }}
            >
              <Play size={11} />
              {t('script.applyBtn')}
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={handleCopySpec}
              style={{ height: 27, padding: '0 8px', fontSize: 11.2 }}
              title={t('script.copySpecBtn')}
            >
              <BookOpen size={11} />
              {t('script.copySpecBtn')}
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={() => scriptImportRef.current?.click()}
              style={{ height: 27, padding: '0 7px', fontSize: 11.2 }}
              title={t('script.importMdBtn')}
            >
              <Upload size={11} />
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={onExportProjectScript}
              style={{ height: 27, padding: '0 7px', fontSize: 11.2 }}
              title={t('script.exportMdBtn')}
            >
              <Download size={11} />
            </button>
          </div>

          <textarea
            className="studio-textarea"
            value={projectDraft}
            onChange={(e) => {
              setProjectDraft(e.target.value);
              setIsProjectDirty(true);
            }}
            spellCheck={false}
            style={{
              flex: 1,
              resize: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              lineHeight: 1.5,
              padding: 10,
            }}
          />
        </>
      )}

      {activeWarnings.length > 0 && (
        <div
          style={{
            padding: '7px 9px',
            borderRadius: 7,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.36)',
            color: '#fcd34d',
            fontSize: 11.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxHeight: 96,
            overflowY: 'auto',
          }}
        >
          {activeWarnings.map((w, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <AlertTriangle size={12} style={{ flexShrink: 0 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
