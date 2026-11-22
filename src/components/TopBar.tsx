import React, { useRef } from 'react';
import {
  Download,
  FolderOpen,
  Globe,
  Monitor,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Undo2,
  X,
} from 'lucide-react';
import { AspectRatio, LessonScene, ThemeId } from '../model/scene';
import { LessonProject } from '../model/project';
import { getPresetProjects } from '../model/presets';
import {
  exportRegistry,
  presentationRegistry,
  useRegistryList,
} from '../plugins';
import { useI18n } from '../i18n';

interface TopBarProps {
  project: LessonProject;
  scene: LessonScene;
  sidebarOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleSidebar: () => void;
  onSelectPreset: (presetId: string) => void;
  onResetPreset: (presetId: string) => void;
  onChangeTheme: (theme: ThemeId) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
  exporterId: string;
  onChangeExporterId: (id: string) => void;
  exporting: boolean;
  exportProgress: number;
  onStartExport: () => void;
  onCancelExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  scene,
  sidebarOpen,
  canUndo,
  canRedo,
  onToggleSidebar,
  onSelectPreset,
  onResetPreset,
  onChangeTheme,
  onChangeAspectRatio,
  onUndo,
  onRedo,
  onSaveProjectJson,
  onImportProjectJson,
  exporterId,
  onChangeExporterId,
  exporting,
  exportProgress,
  onStartExport,
  onCancelExport,
}) => {
  const { locale, setLocale, t, pluginName, exporterShort } = useI18n();
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const presentations = useRegistryList(presentationRegistry);
  const exporters = useRegistryList(exportRegistry);
  const presetProjects = getPresetProjects(locale);
  const activePresetId = presetProjects.some((p) => p.id === project.id)
    ? project.id
    : 'custom';

  return (
    <header
      style={{
        minHeight: 50,
        height: 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 14px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        rowGap: 6,
        columnGap: 10,
        flexShrink: 0,
      }}
    >
      {/* Left: Brand & sidebar toggle & preset selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="studio-btn"
          onClick={onToggleSidebar}
          title={
            sidebarOpen
              ? t('topbar.collapseSidebar')
              : t('topbar.expandSidebar')
          }
          style={{ width: 32, padding: 0 }}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={15} />
          ) : (
            <PanelLeftOpen size={15} />
          )}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 8,
            borderRight: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f3c969 0%, #e09f3e 100%)',
              color: '#14181f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(243, 201, 105, 0.28)',
            }}
          >
            <Pencil size={15} strokeWidth={2.4} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: 0.2 }}>
              Penova
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('topbar.brandSubtitle')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('topbar.templatesLabel')}
          </span>
          <select
            className="studio-select"
            value={activePresetId}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onSelectPreset(e.target.value);
              }
            }}
            style={{ width: 184, height: 30, padding: '0 8px' }}
          >
            {presetProjects.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title}
              </option>
            ))}
            {activePresetId === 'custom' && (
              <option value="custom">{t('topbar.customTemplate')}</option>
            )}
          </select>
          {activePresetId !== 'custom' && (
            <button
              type="button"
              className="studio-btn"
              aria-label={t('topbar.resetTemplateAria')}
              title={t('topbar.resetTemplateTitle')}
              onClick={() => onResetPreset(activePresetId)}
              style={{ width: 28, height: 30, padding: 0, flexShrink: 0 }}
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Center: Theme & Aspect Ratio */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="studio-pill-group" title={t('topbar.themeGroupTitle')}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 6px',
              color: 'var(--text-muted)',
            }}
          >
            <Palette size={13} />
          </span>
          {presentations.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`studio-pill-item ${scene.theme === p.id ? 'active' : ''}`}
              onClick={() => onChangeTheme(p.id)}
            >
              {pluginName(p.id, p.name)}
            </button>
          ))}
        </div>

        <div className="studio-pill-group" title={t('topbar.aspectGroupTitle')}>
          <button
            type="button"
            className={`studio-pill-item ${scene.aspectRatio === '16:9' ? 'active' : ''}`}
            onClick={() => onChangeAspectRatio('16:9')}
          >
            <Monitor size={13} />
            {t('topbar.aspectLandscape')}
          </button>
          <button
            type="button"
            className={`studio-pill-item ${scene.aspectRatio === '9:16' ? 'active' : ''}`}
            onClick={() => onChangeAspectRatio('9:16')}
          >
            <Smartphone size={13} />
            {t('topbar.aspectPortrait')}
          </button>
        </div>
      </div>

      {/* Right: Language Switcher, Undo/Redo, Save/Import Project JSON & Exporters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div className="studio-pill-group" title={t('topbar.languageTitle')}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 4px 0 5px',
              color: 'var(--text-muted)',
            }}
          >
            <Globe size={12} />
          </span>
          <button
            type="button"
            className={`studio-pill-item ${locale === 'en' ? 'active' : ''}`}
            onClick={() => setLocale('en')}
            style={{ padding: '0 6px', fontSize: 11 }}
          >
            EN
          </button>
          <button
            type="button"
            className={`studio-pill-item ${locale === 'zh-CN' ? 'active' : ''}`}
            onClick={() => setLocale('zh-CN')}
            style={{ padding: '0 6px', fontSize: 11 }}
          >
            中文
          </button>
        </div>

        <input
          ref={projectFileInputRef}
          type="file"
          accept=".json,.penova.json,.pencil.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportProjectJson(file);
            }
            e.currentTarget.value = '';
          }}
        />

        <div className="studio-pill-group" title={t('topbar.historyGroupTitle')}>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.undoAria')}
            title={t('topbar.undoTitle')}
            disabled={!canUndo}
            onClick={onUndo}
            style={{
              padding: '0 6px',
              opacity: canUndo ? 1 : 0.35,
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.redoAria')}
            title={t('topbar.redoTitle')}
            disabled={!canRedo}
            onClick={onRedo}
            style={{
              padding: '0 6px',
              opacity: canRedo ? 1 : 0.35,
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
          >
            <Redo2 size={13} />
          </button>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.saveAria')}
            title={t('topbar.saveTitle')}
            onClick={onSaveProjectJson}
            style={{ padding: '0 6px' }}
          >
            <Save size={13} />
          </button>
          <button
            type="button"
            className="studio-pill-item"
            aria-label={t('topbar.importAria')}
            title={t('topbar.importTitle')}
            onClick={() => projectFileInputRef.current?.click()}
            style={{ padding: '0 6px' }}
          >
            <FolderOpen size={13} />
          </button>
        </div>

        {exporting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 7,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(243, 201, 105, 0.45)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{t('topbar.exportingPct', { pct: exportProgress })}</span>
            </div>
            <button
              type="button"
              className="studio-btn danger"
              onClick={onCancelExport}
              title={t('topbar.cancelExportTitle')}
            >
              <X size={14} />
              {t('topbar.cancel')}
            </button>
          </div>
        ) : (
          <>
            <select
              className="studio-select"
              aria-label={t('topbar.exportFormatAria')}
              title={t('topbar.exportFormatTitle')}
              value={exporterId}
              onChange={(e) => onChangeExporterId(e.target.value)}
              style={{ width: 118, height: 30, padding: '0 7px', fontSize: 12 }}
            >
              {exporters.map((exp) => {
                const supported = exp.isSupported ? exp.isSupported() : true;
                const label = exporterShort(
                  exp.id,
                  exp.shortLabel ?? pluginName(exp.id, exp.name)
                );
                return (
                  <option key={exp.id} value={exp.id} disabled={!supported}>
                    {supported
                      ? label
                      : t('topbar.exporterUnavailable', { label })}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="studio-btn primary"
              onClick={onStartExport}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Download size={14} />
              {t('topbar.exportBtn')}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
