import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { LessonScene } from '../../model/scene';
import { SceneTextCodec } from '../../plugins';
import { useI18n } from '../../i18n';

interface ScriptCodecPaneProps {
  scene: LessonScene;
  codec: SceneTextCodec;
  scriptText: string;
  warnings: string[];
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
}

function hasNonCardNodes(scene: LessonScene): boolean {
  return scene.nodes.some((n) => {
    if (n.type === 'text' || n.type === 'shape') return true;
    if (n.type === 'group' && n.arrange && n.arrange !== 'card') return true;
    if (n.type === 'connector' && (!n.fromId || !n.toId)) return true;
    return false;
  });
}

export const ScriptCodecPane: React.FC<ScriptCodecPaneProps> = ({
  scene,
  codec,
  scriptText,
  warnings,
  onFocus,
  onBlur,
  onChange,
}) => {
  const { t, codecMeta } = useI18n();
  const meta = codecMeta(codec);
  const showAtomNotice = hasNonCardNodes(scene);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        gap: 10,
        minHeight: 0,
      }}
    >
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

      {showAtomNotice && (
        <div
          style={{
            padding: '7px 9px',
            borderRadius: 7,
            background: 'rgba(125, 216, 247, 0.08)',
            border: '1px solid rgba(125, 216, 247, 0.28)',
            color: '#bae6fd',
            fontSize: 11.2,
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('script.nonCardNotice')}</span>
        </div>
      )}

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

      {warnings.length > 0 && (
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
          {warnings.map((w, i) => (
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
